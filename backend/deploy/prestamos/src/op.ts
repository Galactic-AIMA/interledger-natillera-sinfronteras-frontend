// Open Payments para la fase 2 de préstamos y la cuota automática (flujos 11, 12 y 12B).
// Las piezas de cliente, billeteras, returnUrl y hash son copia de deploy/payments/src (shared.ts y
// start-payment-duvan.ts, de David y Duvan) para no tocar sus archivos: mismo secreto, misma lista de
// billeteras permitidas y misma verificación del hash.
import { createHash } from 'node:crypto';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { createAuthenticatedClient, type AuthenticatedClient } from '@interledger/open-payments';
import { dynamo, HttpError, type Amount } from './shared';

export const opEnv = {
  secretId: process.env.OP_SECRET_ID || 'natillera/open-payments-client',
  usersTable: process.env.USER_VIEW_TABLE || 'user-info',
  paymentsTable: process.env.PAYMENTS_TABLE || 'natillera-payments',
  grantsTable: process.env.GRANTS_TABLE || 'natillera-grants',
  // Opción B de pagos: la billetera vuelve a return-payment (de David), que completa el desembolso.
  returnBaseUrl: (process.env.RETURN_BASE_URL || '').replace(/\/$/, ''),
  walletHosts: (process.env.WALLET_HOSTS || 'ilp.interledger-test.dev').split(',').map((h) => h.trim()),
  // Margen sobre la quote para el tope de cada cobro recurrente: la tasa se mueve entre cobros.
  limitMarginBps: BigInt(process.env.GRANT_LIMIT_MARGIN_BPS || '500'),
};

// ---------------------------------------------------------------- Cliente

// Cliente con la llave del Secrets Manager, uno por contenedor. Las pruebas ponen uno falso.
let clientPromise: Promise<AuthenticatedClient> | undefined;
export const setClientForTests = (client: unknown) => {
  clientPromise = Promise.resolve(client as AuthenticatedClient);
};
export const getClient = () => {
  clientPromise ??= (async () => {
    const sm = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const res = await sm.send(new GetSecretValueCommand({ SecretId: opEnv.secretId }));
    const secret = JSON.parse(res.SecretString ?? '{}');
    return createAuthenticatedClient({
      walletAddressUrl: secret.walletAddressUrl,
      keyId: secret.keyId,
      privateKey: secret.privateKey,
      validateResponses: false,
    });
  })();
  clientPromise.catch(() => (clientPromise = undefined));
  return clientPromise;
};

// ---------------------------------------------------------------- Billeteras

// Solo billeteras del Test Wallet: el backend no consulta URLs arbitrarias.
export const checkWalletUrl = (value: unknown): string => {
  let url: URL;
  try {
    url = new URL(String(value));
  } catch {
    throw new HttpError(400, 'InvalidWalletAddress', 'Invalid wallet address');
  }
  if (url.protocol !== 'https:' || !opEnv.walletHosts.includes(url.hostname) || url.username || url.password) {
    throw new HttpError(400, 'InvalidWalletAddress', 'Wallet address host not allowed');
  }
  return url.href;
};

// Billetera registrada de una persona (user-info, la misma consulta que start-payment).
export const userWalletUrl = async (username: string) => {
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: opEnv.usersTable,
      KeyConditionExpression: '#source = :source',
      ExpressionAttributeNames: { '#source': 'source' },
      ExpressionAttributeValues: { ':source': username },
      ScanIndexForward: false,
      Limit: 1,
    }),
  );
  const item = Items?.[0];
  const url = item?.walletAddress ?? item?.walletInfo?.id;
  if (!url) throw new HttpError(404, 'UserNotFound', 'User has no registered wallet');
  return checkWalletUrl(url);
};

// ---------------------------------------------------------------- Retorno de la billetera

const RETURN_URLS = [/^natillera:\/\/retorno$/, /^exp:\/\/[A-Za-z0-9.-]+(:\d{1,5})?\/--\/retorno$/];
export const validateReturnUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !RETURN_URLS.some((re) => re.test(value))) {
    throw new HttpError(400, 'InvalidReturnUrl', 'returnUrl must be natillera://retorno or exp://<host>/--/retorno');
  }
  return value;
};

// SHA-256 de clientNonce \n finishNonce \n interact_ref \n URL del grant (variantes de base64 y barra final).
export const verifyInteractHash = (clientNonce: string, finishNonce: string, authServer: string, interactRef: string, hash: string) => {
  const urls = new Set([authServer, authServer.replace(/\/$/, ''), authServer.replace(/\/?$/, '/')]);
  for (const url of urls) {
    const digest = createHash('sha256').update(`${clientNonce}\n${finishNonce}\n${interactRef}\n${url}`).digest();
    const variants = [digest.toString('base64'), digest.toString('base64').replace(/=+$/, ''), digest.toString('base64url')];
    if (variants.includes(hash)) return true;
  }
  return false;
};

// ---------------------------------------------------------------- Montos

export const withMargin = (a: Amount): Amount => ({
  ...a,
  value: ((BigInt(a.value) * (10000n + opEnv.limitMarginBps) + 9999n) / 10000n).toString(),
});

const toAmount = (a: { value: string; assetCode: string; assetScale: number }): Amount => ({
  value: String(a.value),
  assetCode: a.assetCode,
  assetScale: a.assetScale,
});

// Incoming payment en la billetera que recibe + quote desde la que paga. Con `receive`, llega ese monto
// exacto (cuotas); con `debit`, sale ese monto exacto (desembolso: el préstamo está en la moneda del fondo).
export const quotePayment = async (
  senderUrl: string,
  receiverUrl: string,
  fixed: { receive: Amount } | { debit: Amount },
) => {
  const client = await getClient();
  const sender = await client.walletAddress.get({ url: senderUrl });
  const receiver = await client.walletAddress.get({ url: receiverUrl });
  if (sender.id === receiver.id) throw new HttpError(400, 'BadRequest', 'Sender and receiver are the same wallet');

  const incomingGrant: any = await client.grant.request(
    { url: receiver.authServer },
    { access_token: { access: [{ type: 'incoming-payment', actions: ['read', 'complete', 'create'] }] } },
  );
  const incoming = await client.incomingPayment.create(
    { url: receiver.resourceServer, accessToken: incomingGrant.access_token.value },
    'receive' in fixed
      ? { walletAddress: receiver.id, incomingAmount: { ...fixed.receive } }
      : { walletAddress: receiver.id },
  );

  const quoteGrant: any = await client.grant.request(
    { url: sender.authServer },
    { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } },
  );
  const quote = await client.quote.create(
    { url: sender.resourceServer, accessToken: quoteGrant.access_token.value },
    'receive' in fixed
      ? { walletAddress: sender.id, receiver: incoming.id, method: 'ilp' }
      : { walletAddress: sender.id, receiver: incoming.id, method: 'ilp', debitAmount: { ...fixed.debit } },
  );
  return {
    sender,
    receiver,
    incomingPaymentId: incoming.id,
    quoteId: quote.id,
    debitAmount: toAmount(quote.debitAmount),
    receiveAmount: toAmount(quote.receiveAmount),
  };
};
