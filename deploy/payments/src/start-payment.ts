// POST /payments — flujo 3 (iniciar pago). Contrato: docs/api-contrato.md del front.
// Body: { kind: 'p2p' | 'aporte', customWalletName? | natilleraId? | walletAddress?, author?,
//         value, assetCode, assetScale, returnUrl }
// Respuesta: { paymentId, redirectUrl, debitAmount, receiveAmount }
//
// Monto: si assetCode/assetScale son los de quien RECIBE, se fija lo que llega (incomingAmount);
// si son los de quien PAGA, se fija lo que sale (quote con debitAmount).
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { isFinalizedGrantWithAccessToken, isPendingGrant } from '@interledger/open-payments';
import {
  dynamo,
  env,
  getClient,
  getUser,
  HttpError,
  parseBody,
  currentUsername,
  validateReturnUrl,
  withErrors,
  type Amount,
  type PaymentRecord,
} from './shared';

const WALLET_HOSTS = (process.env.WALLET_HOSTS || 'ilp.interledger-test.dev').split(',').map((h) => h.trim());

// Solo se consultan wallets de los hosts permitidos (evita que el backend llame URLs arbitrarias).
const checkWalletUrl = (value: unknown): string => {
  let url: URL;
  try {
    url = new URL(String(value));
  } catch {
    throw new HttpError(400, 'InvalidWalletAddress', 'Invalid wallet address');
  }
  if (url.protocol !== 'https:' || !WALLET_HOSTS.includes(url.hostname) || url.username || url.password) {
    throw new HttpError(400, 'InvalidWalletAddress', 'Wallet address host not allowed');
  }
  return url.href;
};

const parseAmount = (body: Record<string, any>): Amount => {
  const { value, assetCode, assetScale } = body;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, 'InvalidAmount', 'value must be a positive integer string in minor units');
  }
  if (typeof assetCode !== 'string' || !Number.isInteger(assetScale)) {
    throw new HttpError(400, 'InvalidAmount', 'assetCode and assetScale are required');
  }
  return { value, assetCode, assetScale };
};

// A quién se le paga: cuenta guardada (flujo 6), natillera (flujo 9) o wallet directa (pruebas P0).
const resolveReceiver = async (username: string, body: Record<string, any>) => {
  if (body.kind === 'aporte') {
    if (!body.natilleraId) throw new HttpError(400, 'BadRequest', 'natilleraId is required for aporte');
    const { Item } = await dynamo.send(
      new GetCommand({ TableName: env.natillerasTable, Key: { natilleraId: String(body.natilleraId) } }),
    );
    if (!Item) throw new HttpError(404, 'NatilleraNotFound', 'Natillera not found');
    if (!Array.isArray(Item.integrants) || !Item.integrants.includes(username)) {
      throw new HttpError(403, 'Forbidden', 'You are not a member of this natillera');
    }
    return { walletUrl: checkWalletUrl(Item.walletAddress), name: Item.natilleraName as string, natilleraId: Item.natilleraId as string };
  }
  if (body.kind !== 'p2p') throw new HttpError(400, 'BadRequest', "kind must be 'p2p' or 'aporte'");
  if (body.customWalletName) {
    const { Item } = await dynamo.send(
      new GetCommand({
        TableName: env.savedAccountsTable,
        Key: { author: username, customWalletName: String(body.customWalletName) },
      }),
    );
    if (!Item) throw new HttpError(404, 'AccountNotFound', 'Saved account not found');
    return { walletUrl: checkWalletUrl(Item.walletAddress), name: Item.customWalletName as string };
  }
  if (body.walletAddress) return { walletUrl: checkWalletUrl(body.walletAddress), name: '' };
  throw new HttpError(400, 'BadRequest', 'customWalletName (or walletAddress) is required for p2p');
};

export const handler = withErrors(async (event) => {
  const username = currentUsername(event);
  const body = parseBody(event);
  const returnUrl = validateReturnUrl(body.returnUrl);
  const amount = parseAmount(body);
  const receiverInfo = await resolveReceiver(username, body);
  const user = await getUser(username);

  const client = await getClient();
  const [sender, receiver] = await Promise.all([
    client.walletAddress.get({ url: checkWalletUrl(user.walletAddress) }),
    client.walletAddress.get({ url: receiverInfo.walletUrl }),
  ]);
  if (sender.id === receiver.id) throw new HttpError(400, 'BadRequest', 'Sender and receiver are the same wallet');

  const sameAs = (w: { assetCode: string; assetScale: number }) =>
    w.assetCode === amount.assetCode && w.assetScale === amount.assetScale;
  const fixedReceive = sameAs(receiver);
  if (!fixedReceive && !sameAs(sender)) {
    throw new HttpError(
      400,
      'InvalidAmount',
      `Amount asset must be the receiver's (${receiver.assetCode}/${receiver.assetScale}) or yours (${sender.assetCode}/${sender.assetScale})`,
    );
  }

  // 1. Incoming payment en la wallet de quien recibe.
  const incomingGrant = await client.grant.request(
    { url: receiver.authServer },
    { access_token: { access: [{ type: 'incoming-payment', actions: ['create', 'read', 'complete'] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(incomingGrant)) throw new HttpError(502, 'OpenPaymentsError', 'Incoming payment grant is not finalized');
  const incomingPayment = await client.incomingPayment.create(
    { url: receiver.resourceServer, accessToken: incomingGrant.access_token.value },
    { walletAddress: receiver.id, ...(fixedReceive ? { incomingAmount: amount } : {}) },
  );

  // 2. Quote en la wallet de quien paga.
  const quoteGrant = await client.grant.request(
    { url: sender.authServer },
    { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(quoteGrant)) throw new HttpError(502, 'OpenPaymentsError', 'Quote grant is not finalized');
  const quote = await client.quote.create(
    { url: sender.resourceServer, accessToken: quoteGrant.access_token.value },
    {
      walletAddress: sender.id,
      receiver: incomingPayment.id,
      method: 'ilp',
      ...(fixedReceive ? {} : { debitAmount: amount }),
    },
  );

  // 3. Grant interactivo para el outgoing payment: la persona aprueba en su billetera y vuelve a la app.
  const paymentId = randomUUID();
  const clientNonce = randomUUID();
  const outgoingGrant = await client.grant.request(
    { url: sender.authServer },
    {
      access_token: {
        access: [
          {
            type: 'outgoing-payment',
            actions: ['create', 'read'],
            identifier: sender.id,
            limits: { debitAmount: quote.debitAmount },
          },
        ],
      },
      interact: {
        start: ['redirect'],
        finish: { method: 'redirect', uri: `${returnUrl}?paymentId=${paymentId}`, nonce: clientNonce },
      },
    },
  );
  if (!isPendingGrant(outgoingGrant) || !outgoingGrant.interact?.redirect) {
    throw new HttpError(502, 'OpenPaymentsError', 'Expected an interactive grant');
  }

  const now = new Date().toISOString();
  const record: PaymentRecord = {
    paymentId,
    author: username,
    kind: body.kind,
    status: 'pending',
    counterpartName: receiverInfo.name || receiver.publicName || receiver.id,
    natilleraId: receiverInfo.natilleraId,
    onBehalfOf: body.kind === 'aporte' && body.author ? String(body.author) : undefined,
    senderWalletAddress: sender.id,
    receiverWalletAddress: receiver.id,
    incomingPaymentId: incomingPayment.id,
    quoteId: quote.id,
    debitAmount: quote.debitAmount,
    receiveAmount: quote.receiveAmount,
    authServer: sender.authServer,
    clientNonce,
    interactFinishNonce: outgoingGrant.interact.finish,
    continueUri: outgoingGrant.continue.uri,
    continueToken: outgoingGrant.continue.access_token.value,
    createdAt: now,
    updatedAt: now,
  };
  await dynamo.send(new PutCommand({ TableName: env.paymentsTable, Item: record }));

  return {
    paymentId,
    redirectUrl: outgoingGrant.interact.redirect,
    debitAmount: quote.debitAmount,
    receiveAmount: quote.receiveAmount,
  };
});
