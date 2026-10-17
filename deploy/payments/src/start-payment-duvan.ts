// POST /payments — versión de Duvan (app/src/handlers/start-payment.ts, rama duvdev, "Feat: return quote")
// con lo mínimo para cumplir el contrato del front y encadenar con la fase "complete"
// (return-payment / finish-payment → complete.ts: grant.continue + outgoing payment).
// Cada cambio sobre su código está marcado con // [fix].
//
// Fases de Duvan:  1. start (incoming payment + quote)  2. continue (grant interactivo → enlace)
//                  3. complete (return-payment / finish-payment)
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { isPendingGrant } from '@interledger/open-payments';
import {
  currentUsername,
  dynamo,
  env,
  getClient,
  HttpError,
  parseBody,
  validateReturnUrl,
  withErrors,
  type PaymentRecord,
} from './shared';

// [fix] La billetera vuelve aquí después de aprobar (opción B): return-payment completa el pago.
const RETURN_BASE_URL = (process.env.RETURN_BASE_URL || '').replace(/\/$/, '');
const WALLET_HOSTS = (process.env.WALLET_HOSTS || 'ilp.interledger-test.dev').split(',').map((h) => h.trim());

// [fix] Solo wallets del Test Wallet (el backend no debe consultar URLs arbitrarias).
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

// [fix] A quién se le paga: wallet directa, cuenta guardada (flujo 6) o natillera (aporte, flujo 9).
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
    return { url: checkWalletUrl(Item.walletAddress), name: Item.natilleraName as string, natilleraId: Item.natilleraId as string };
  }
  if (body.customWalletName) {
    const { Item } = await dynamo.send(
      new GetCommand({ TableName: env.savedAccountsTable, Key: { author: username, customWalletName: String(body.customWalletName) } }),
    );
    if (!Item) throw new HttpError(404, 'AccountNotFound', 'Saved account not found');
    return { url: checkWalletUrl(Item.walletAddress), name: Item.customWalletName as string };
  }
  if (body.walletAddress) return { url: checkWalletUrl(body.walletAddress), name: '' };
  throw new HttpError(400, 'BadRequest', 'walletAddress, customWalletName or natilleraId is required');
};

export const handler = withErrors(async (event: any) => {
  const username = currentUsername(event); // [fix] solo del autorizador (event.auth.username en VTL)
  const body = parseBody(event); // [fix] VTL: event.body
  const returnUrl = validateReturnUrl(body.returnUrl); // [fix] contrato: natillera:// o exp://…/--/retorno

  const userInfo = await getUserInfo(username);
  if (!userInfo) throw new HttpError(404, 'UserNotFound', 'User not found');

  // [fix] Una sola llave, la del cliente (Secrets Manager, OP_SECRET_ID). return-payment hace el
  // grant.continue con este mismo cliente: si el grant se pidiera con otra llave, no se podría completar.
  // (Antes: userInfo.walletInfo.walletKeys, que solo existe para prueba1.)
  const client = await getClient();

  // [fix] Wallet de quien paga: la de su registro (walletAddress del pre-signup).
  const sendingWalletAddress = await client.walletAddress.get({
    url: checkWalletUrl(userInfo.walletAddress ?? userInfo.walletInfo?.id),
  });

  const receiver = await resolveReceiver(username, body);
  const receivingWalletAddressURL = receiver.url;
  console.log(receivingWalletAddressURL);

  const receivingWalletAddress = await client.walletAddress.get({
    url: receivingWalletAddressURL,
  });
  if (receivingWalletAddress.id === sendingWalletAddress.id) {
    throw new HttpError(400, 'BadRequest', 'Sender and receiver are the same wallet');
  }

  // [fix] El front manda `value` (Duvan usaba `amount`). Monto fijo en la moneda de quien RECIBE.
  const amount = String(body.amount ?? body.value ?? '');
  if (!/^[1-9]\d{0,15}$/.test(amount)) {
    throw new HttpError(400, 'InvalidAmount', 'value must be a positive integer string in minor units');
  }
  if (
    body.assetCode !== undefined &&
    (body.assetCode !== receivingWalletAddress.assetCode || Number(body.assetScale) !== receivingWalletAddress.assetScale)
  ) {
    throw new HttpError(
      400,
      'InvalidAmount',
      `Amount must be in the receiver's currency (${receivingWalletAddress.assetCode}, scale ${receivingWalletAddress.assetScale})`,
    );
  }

  const incomingPaymentGrant = await client.grant.request(
    {
      url: receivingWalletAddress.authServer,
    },
    {
      access_token: {
        access: [
          {
            type: "incoming-payment",
            actions: ["read", "complete", "create"],
          },
        ],
      },
    }
  );

  const incomingPayment = await client.incomingPayment.create(
    {
      url: receivingWalletAddress.resourceServer,
      accessToken: (incomingPaymentGrant as any).access_token.value,
    },
    {
      walletAddress: receivingWalletAddress.id,
      incomingAmount: {
        assetCode: receivingWalletAddress.assetCode,
        assetScale: receivingWalletAddress.assetScale,
        value: amount, // [fix]
      },
    }
  );

  const quoteGrant = await client.grant.request(
    {
      url: sendingWalletAddress.authServer, // [fix] antes userInfo.walletInfo.authServer
    },
    {
      access_token: {
        access: [
          {
            type: "quote",
            actions: ["create", "read"],
          },
        ],
      },
    }
  );

  const quote = await client.quote.create(
    {
      url: sendingWalletAddress.resourceServer, // [fix]
      accessToken: (quoteGrant as any).access_token.value,
    },
    {
      walletAddress: sendingWalletAddress.id, // [fix]
      receiver: incomingPayment.id,
      method: "ilp",
    }
  );

  // [fix] Se quitó `return quote;`: sigue la fase 2 (continue → enlace de aprobación).
  const paymentId = randomUUID();
  const clientNonce = randomUUID();

  const outgoingPaymentGrant = await client.grant.request(
    {
      url: sendingWalletAddress.authServer, // [fix]
    },
    {
      access_token: {
        access: [
          {
            type: "outgoing-payment",
            actions: ["read", "create"],
            limits: {
              debitAmount: {
                assetCode: quote.debitAmount.assetCode,
                assetScale: quote.debitAmount.assetScale,
                value: quote.debitAmount.value,
              },
            },
            identifier: sendingWalletAddress.id, // [fix]
          },
        ],
      },
      interact: {
        start: ["redirect"],
        // [fix] Al aprobar, la billetera vuelve al backend con interact_ref + hash (fase 3: complete).
        finish: {
          method: "redirect",
          uri: RETURN_BASE_URL ? `${RETURN_BASE_URL}/payments/${paymentId}/return` : `${returnUrl}?paymentId=${paymentId}`,
          nonce: clientNonce,
        },
      },
    }
  );
  if (!isPendingGrant(outgoingPaymentGrant) || !outgoingPaymentGrant.interact?.redirect) {
    throw new HttpError(502, 'OpenPaymentsError', 'Expected an interactive grant');
  }

  // [fix] El TO DO de Duvan: guardar en payments-history. Estos campos los usa complete.ts.
  const now = new Date().toISOString();
  const record: PaymentRecord = {
    paymentId,
    author: username,
    kind: body.kind === 'aporte' ? 'aporte' : 'p2p',
    status: 'pending',
    counterpartName: receiver.name || receivingWalletAddress.publicName || receivingWalletAddress.id,
    natilleraId: receiver.natilleraId,
    onBehalfOf: body.kind === 'aporte' && body.author ? String(body.author) : undefined,
    senderWalletAddress: sendingWalletAddress.id,
    receiverWalletAddress: receivingWalletAddress.id,
    incomingPaymentId: incomingPayment.id,
    quoteId: quote.id,
    debitAmount: quote.debitAmount,
    receiveAmount: quote.receiveAmount,
    authServer: sendingWalletAddress.authServer,
    clientNonce,
    interactFinishNonce: outgoingPaymentGrant.interact.finish,
    continueUri: outgoingPaymentGrant.continue.uri,
    continueToken: outgoingPaymentGrant.continue.access_token.value,
    appReturnUrl: returnUrl,
    createdAt: now,
    updatedAt: now,
  };
  await savePaymentHistory({ TableName: env.paymentsTable, Item: record });

  // [fix] Respuesta del contrato del front.
  return {
    paymentId,
    redirectUrl: outgoingPaymentGrant.interact.redirect,
    debitAmount: quote.debitAmount,
    receiveAmount: quote.receiveAmount,
  };
});

const getUserInfo = async (username: string) => {
  const command = new QueryCommand({
    TableName: process.env.USER_VIEW_TABLE,
    KeyConditionExpression: "#source = :source",
    Limit: 1,
    ScanIndexForward: false,
    ExpressionAttributeValues: {
      ":source": username,
    },
    ExpressionAttributeNames: {
      '#source': 'source'
    }
  });

  const response = await dynamo.send(command);
  return response.Items?.[0] || null;
}

// [fix] Si no se guarda, el pago no se puede completar: el error ya no se traga.
const savePaymentHistory = async (params: any) => {
  await dynamo.send(new PutCommand(params));
}
