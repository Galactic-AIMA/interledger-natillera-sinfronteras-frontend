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

// Envuelve el handler: convierte errores en { error, message } con su status HTTP.
export const withErrors =
  (fn: (event: any) => Promise<{ statusCode: number; headers: Record<string, string>; body: string }>) =>
  async (event: any) => {
    try {
      return await fn(event);
    } catch (error: any) {
      if (error instanceof HttpError) return json(error.statusCode, { error: error.error, message: error.message });
      if (error instanceof OpenPaymentsClientError) {
        console.log('Open Payments error', error.status, error.code, error.description, error.message);
        return json(502, { error: 'OpenPaymentsError', message: error.description || error.message });
      }
      console.log('Unhandled error', error);
      return json(500, { error: 'InternalError', message: 'Unexpected error' });
    }
  };

// El usuario sale del token validado por el authorizer (regla 0), nunca del body.
// HTTP API (JWT): requestContext.authorizer.jwt.claims.username (access token).
// REST API (Cognito): requestContext.authorizer.claims, con `cognito:username` (id token) o `username` (access token).
export const currentUsername = (event: any): string => {
  const authorizer = event?.requestContext?.authorizer ?? {};
  const claims = authorizer.jwt?.claims ?? authorizer.claims ?? {};
  const username = claims.username ?? claims['cognito:username'];
  if (!username) throw new HttpError(401, 'Unauthorized', 'Missing username claim');
  return username;
};

export const parseBody = (event: any): Record<string, any> => {
  if (!event?.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'BadRequest', 'Body must be valid JSON');
  }
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
