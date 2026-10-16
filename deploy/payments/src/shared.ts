// Utilidades compartidas por start-payment, finish-payment y get-payment (HTTP API, payload 2.0).
import { createHash } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  createAuthenticatedClient,
  OpenPaymentsClientError,
  type AuthenticatedClient,
} from '@interledger/open-payments';

const region = process.env.AWS_REGION;

export const env = {
  secretId: process.env.OP_SECRET_ID || 'natillera/open-payments-client',
  usersTable: process.env.USER_VIEW_TABLE || 'user-info',
  paymentsTable: process.env.PAYMENTS_TABLE || 'payments-history',
  savedAccountsTable: process.env.SAVED_ACCOUNTS_TABLE || 'saved-accounts',
  natillerasTable: process.env.NATILLERAS_TABLE || 'natillera-registration',
};

export const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

export type Amount = { value: string; assetCode: string; assetScale: number };

export type PaymentRecord = {
  paymentId: string;
  author: string;
  kind: 'p2p' | 'aporte';
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
  counterpartName: string;
  natilleraId?: string;
  onBehalfOf?: string;
  senderWalletAddress: string;
  receiverWalletAddress: string;
  incomingPaymentId: string;
  quoteId: string;
  debitAmount: Amount;
  receiveAmount: Amount;
  authServer: string;
  clientNonce: string;
  interactFinishNonce: string;
  continueUri: string;
  continueToken: string;
  outgoingPaymentId?: string;
  createdAt: string;
  updatedAt: string;
};

export class HttpError extends Error {
  constructor(readonly statusCode: number, readonly error: string, message: string) {
    super(message);
  }
}

export const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// Las Lambdas funcionan con dos tipos de integración de API Gateway:
//  - Proxy (HTTP API o REST con "Integración de proxy de Lambda"): el evento trae `requestContext`.
//  - Sin proxy, con plantilla de mapeo VTL (REST): el evento es el JSON que arma la plantilla:
//      { "username": "...", "paymentId": "...", "body": { ...body del request } }
//    o los campos del body sueltos junto a `username` (plantilla actual de start-payment).
//    Ver docs/API-PAGOS.md para las plantillas.
export const isProxyEvent = (event: any) => !!event?.requestContext;

// Envuelve el handler: el handler devuelve el body de la respuesta 200 o lanza HttpError.
//  - Proxy: devuelve { statusCode, headers, body } con el status real.
//  - VTL: devuelve el objeto tal cual (200); en error lanza `[<status>] {"error","message"}`, que la
//    respuesta de integración del método mapea al status con la expresión `^\[<status>\].*`.
export const withErrors =
  (fn: (event: any) => Promise<unknown>) =>
  async (event: any) => {
    const proxy = isProxyEvent(event);
    let status: number;
    let body: { error: string; message: string };
    try {
      const result = await fn(event);
      return proxy ? json(200, result) : result;
    } catch (error: any) {
      if (error instanceof HttpError) {
        status = error.statusCode;
        body = { error: error.error, message: error.message };
      } else if (error instanceof OpenPaymentsClientError) {
        console.log('Open Payments error', error.status, error.code, error.description, error.message);
        status = 502;
        body = { error: 'OpenPaymentsError', message: error.description || error.message };
      } else {
        console.log('Unhandled error', error);
        status = 500;
        body = { error: 'InternalError', message: 'Unexpected error' };
      }
    }
    if (proxy) return json(status, body);
    throw new Error(`[${status}] ${JSON.stringify(body)}`);
  };

// El usuario sale del token validado por el authorizer (regla 0), nunca del body.
// HTTP API (JWT): requestContext.authorizer.jwt.claims.username (access token).
// REST API proxy (Cognito): requestContext.authorizer.claims, con `cognito:username` (id token) o `username`.
// REST API con VTL: `username` que pone la plantilla desde $context.authorizer.claims['cognito:username'].
export const currentUsername = (event: any): string => {
  let username: unknown;
  if (isProxyEvent(event)) {
    const authorizer = event.requestContext.authorizer ?? {};
    const claims = authorizer.jwt?.claims ?? authorizer.claims ?? {};
    username = claims.username ?? claims['cognito:username'];
  } else {
    username = event?.username;
  }
  if (typeof username !== 'string' || !username) throw new HttpError(401, 'Unauthorized', 'Missing username claim');
  return username;
};

export const parseBody = (event: any): Record<string, any> => {
  if (!isProxyEvent(event)) {
    if (event?.body && typeof event.body === 'object') return event.body;
    const { username, paymentId, id, ...fields } = event ?? {};
    return fields;
  }
  if (!event?.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'BadRequest', 'Body must be valid JSON');
  }
};

// {id} de la ruta: pathParameters en proxy; `paymentId` que pone la plantilla en VTL.
export const pathPaymentId = (event: any): string | undefined => {
  const id = isProxyEvent(event) ? event.pathParameters?.id : event?.paymentId ?? event?.id;
  return typeof id === 'string' && id ? id : undefined;
};

// Cliente de Open Payments: se crea una vez por contenedor de Lambda.
// validateResponses: false porque el bundle no incluye los .yaml de OpenAPI del SDK.
let clientPromise: Promise<AuthenticatedClient> | undefined;
export const getClient = () => {
  clientPromise ??= (async () => {
    const sm = new SecretsManagerClient({ region });
    const res = await sm.send(new GetSecretValueCommand({ SecretId: env.secretId }));
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

export const getUser = async (username: string) => {
  const { Item } = await dynamo.send(
    new GetCommand({ TableName: env.usersTable, Key: { source: username, id: 1 } }),
  );
  if (!Item?.walletAddress) throw new HttpError(404, 'UserNotFound', 'User has no registered wallet');
  return Item as { source: string; walletAddress: string; assetCode: string; assetScale: number };
};

export const getPaymentOwnedBy = async (paymentId: string, username: string) => {
  const { Item } = await dynamo.send(new GetCommand({ TableName: env.paymentsTable, Key: { paymentId } }));
  // Mismo 404 si no existe o es de otra persona, para no revelar ids ajenos.
  if (!Item || Item.author !== username) throw new HttpError(404, 'PaymentNotFound', 'Payment not found');
  return Item as PaymentRecord;
};

// Lo que ve el front (nunca tokens ni nonces).
export const publicPayment = (p: PaymentRecord) => ({
  paymentId: p.paymentId,
  kind: p.kind,
  status: p.status === 'processing' ? 'pending' : p.status,
  counterpartName: p.counterpartName,
  natilleraId: p.natilleraId,
  debitAmount: p.debitAmount,
  receiveAmount: p.receiveAmount,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

// returnUrl permitido: el APK (natillera://retorno) o Expo Go (exp://<host>[:puerto]/--/retorno).
const RETURN_URLS = [/^natillera:\/\/retorno$/, /^exp:\/\/[A-Za-z0-9.-]+(:\d{1,5})?\/--\/retorno$/];
export const validateReturnUrl = (value: unknown): string => {
  if (typeof value !== 'string' || !RETURN_URLS.some((re) => re.test(value))) {
    throw new HttpError(400, 'InvalidReturnUrl', 'returnUrl must be natillera://retorno or exp://<host>/--/retorno');
  }
  return value;
};

// Hash de interacción de Open Payments: SHA-256 de clientNonce \n finishNonce \n interact_ref \n URL
// del grant. La doc no es explícita en base64 vs base64url ni en la barra final: se aceptan esas variantes.
export const verifyInteractHash = (
  p: Pick<PaymentRecord, 'clientNonce' | 'interactFinishNonce' | 'authServer'>,
  interactRef: string,
  hash: string,
) => {
  const urls = new Set([p.authServer, p.authServer.replace(/\/$/, ''), p.authServer.replace(/\/?$/, '/')]);
  for (const url of urls) {
    const digest = createHash('sha256').update(`${p.clientNonce}\n${p.interactFinishNonce}\n${interactRef}\n${url}`).digest();
    const variants = [digest.toString('base64'), digest.toString('base64').replace(/=+$/, ''), digest.toString('base64url')];
    if (variants.includes(hash)) return true;
  }
  return false;
};
