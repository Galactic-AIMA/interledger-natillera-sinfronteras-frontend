// Permisos recurrentes de Open Payments (flujos 12 y 12B): la persona aprueba una vez en su billetera un
// grant de outgoing-payment con tope por cobro e intervalo, y el backend cobra con él después.
//  - `recurring`: la cuota de la natillera (POST /recurring …).
//  - `loan-repayment`: las cuotas de un préstamo, antes del desembolso (POST /loans/requests/{id}/repayment-grant …).
//
// Tokens: la regla del equipo es cero tokens en DynamoDB. El token de continuación y, ya aprobado, el
// access token y su URL de manejo viven en Secrets Manager (`natillera/grants/<grantId>`); la tabla
// `natillera-grants` solo guarda datos que no dan acceso a nada.
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { isFinalizedGrantWithAccessToken, isPendingGrant } from '@interledger/open-payments';
import { dynamo, HttpError, type Amount } from './shared';
import { getClient, opEnv, quotePayment, userWalletUrl, verifyInteractHash, withMargin } from './op';

export type GrantKind = 'recurring' | 'loan-repayment';
export type GrantStatus = 'pending' | 'processing' | 'active' | 'rejected';

export type GrantItem = {
  grantId: string;
  kind: GrantKind;
  author: string; // quien da el permiso (dueña de la billetera que paga)
  natilleraId: string;
  requestId?: string; // préstamo (loan-repayment)
  onBehalfOf?: string; // cuota a nombre de otro integrante (recurring)
  amount: Amount; // lo que llega en cada cobro, en la moneda de la natillera
  limitPerCharge: Amount; // tope de cada cobro, en la moneda de quien paga
  repetitions: number;
  interval: string;
  senderWalletAddress: string;
  receiverWalletAddress: string;
  receiverName: string;
  authServer: string;
  clientNonce: string;
  interactFinishNonce: string;
  status: GrantStatus;
  chargedCount: number;
  createdAt: string;
  updatedAt: string;
};

type PendingSecret = { continueUri: string; continueToken: string };
type ActiveSecret = { accessToken: string; manageUrl: string };

// ---------------------------------------------------------------- Secretos de cada grant

const secretName = (grantId: string) => `natillera/grants/${grantId}`;
let sm: SecretsManagerClient | undefined;
const secretsClient = () => (sm ??= new SecretsManagerClient({ region: process.env.AWS_REGION }));

export const grantSecrets = {
  async create(grantId: string, data: PendingSecret) {
    await secretsClient().send(
      new CreateSecretCommand({ Name: secretName(grantId), SecretString: JSON.stringify(data), Description: 'Grant de Open Payments (natillera)' }),
    );
  },
  async put(grantId: string, data: PendingSecret | ActiveSecret) {
    await secretsClient().send(new PutSecretValueCommand({ SecretId: secretName(grantId), SecretString: JSON.stringify(data) }));
  },
  async get<T>(grantId: string): Promise<T> {
    const res = await secretsClient().send(new GetSecretValueCommand({ SecretId: secretName(grantId) }));
    return JSON.parse(res.SecretString ?? '{}') as T;
  },
};
export const setGrantSecretsForTests = (fake: typeof grantSecrets) => Object.assign(grantSecrets, fake);

// ---------------------------------------------------------------- Vista pública

// Lo que ve la app (RecurringGrant del front): nunca tokens ni nonces.
export const publicGrant = (g: GrantItem, redirectUrl = '') => ({
  grantId: g.grantId,
  redirectUrl,
  limitPerCharge: g.limitPerCharge,
  repetitions: g.repetitions,
  status: g.status === 'processing' ? ('pending' as const) : g.status,
});

const getGrant = async (grantId: string) => {
  const { Item } = await dynamo.send(new GetCommand({ TableName: opEnv.grantsTable, Key: { grantId } }));
  return (Item as GrantItem | undefined) ?? null;
};

// Mismo 404 si no existe, es de otra persona o de otro tipo: no se revelan grants ajenos.
export const getOwnGrant = async (grantId: string | undefined, username: string, kind: GrantKind) => {
  const grant = grantId ? await getGrant(grantId) : null;
  if (!grant || grant.author !== username || grant.kind !== kind) throw new HttpError(404, 'GrantNotFound', 'Grant not found');
  return grant;
};

const setGrant = async (grantId: string, fields: Partial<GrantItem>, condition?: { status: GrantStatus }) => {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets: string[] = [];
  for (const [key, value] of Object.entries({ ...fields, updatedAt: new Date().toISOString() })) {
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    sets.push(`#${key} = :${key}`);
  }
  if (condition) {
    names['#cond'] = 'status';
    values[':cond'] = condition.status;
  }
  await dynamo.send(
    new UpdateCommand({
      TableName: opEnv.grantsTable,
      Key: { grantId },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ConditionExpression: condition ? '#cond = :cond' : undefined,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
};

// ---------------------------------------------------------------- Iniciar (grant interactivo)

// Mensual, empezando ahora: R<n>/<inicio>/P1M (ISO 8601). El tope se aplica en cada intervalo.
const monthlyInterval = (repetitions: number) => `R${repetitions}/${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}/P1M`;

export const startGrant = async (p: {
  username: string;
  kind: GrantKind;
  natilleraId: string;
  requestId?: string;
  onBehalfOf?: string;
  amount: Amount;
  repetitions: number;
  receiverUrl: string;
  receiverName: string;
  returnUrl: string;
}) => {
  const senderUrl = await userWalletUrl(p.username);
  // La quote de hoy da cuánto sale de la billetera de quien paga por cada cobro; el tope lleva margen.
  const q = await quotePayment(senderUrl, p.receiverUrl, { receive: p.amount });
  const limitPerCharge = withMargin(q.debitAmount);
  const grantId = randomUUID();
  const clientNonce = randomUUID();
  const interval = monthlyInterval(p.repetitions);

  const client = await getClient();
  const grant = await client.grant.request(
    { url: q.sender.authServer },
    {
      access_token: {
        access: [
          {
            type: 'outgoing-payment',
            actions: ['create', 'read'],
            identifier: q.sender.id,
            limits: { debitAmount: limitPerCharge, interval },
          },
        ],
      },
      interact: {
        start: ['redirect'],
        // La billetera vuelve directo a la app con interact_ref y hash; la app llama a …/finish.
        finish: { method: 'redirect', uri: `${p.returnUrl}?grantId=${grantId}`, nonce: clientNonce },
      },
    },
  );
  if (!isPendingGrant(grant) || !grant.interact?.redirect) throw new HttpError(502, 'OpenPaymentsError', 'Expected an interactive grant');

  await grantSecrets.create(grantId, { continueUri: grant.continue.uri, continueToken: grant.continue.access_token.value });
  const now = new Date().toISOString();
  const item: GrantItem = {
    grantId,
    kind: p.kind,
    author: p.username,
    natilleraId: p.natilleraId,
    requestId: p.requestId,
    onBehalfOf: p.onBehalfOf,
    amount: p.amount,
    limitPerCharge,
    repetitions: p.repetitions,
    interval,
    senderWalletAddress: q.sender.id,
    receiverWalletAddress: q.receiver.id,
    receiverName: p.receiverName,
    authServer: q.sender.authServer,
    clientNonce,
    interactFinishNonce: grant.interact.finish,
    status: 'pending',
    chargedCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await dynamo.send(new PutCommand({ TableName: opEnv.grantsTable, Item: item, ConditionExpression: 'attribute_not_exists(grantId)' }));
  return { item, redirectUrl: grant.interact.redirect };
};

// ---------------------------------------------------------------- Finalizar (la persona aprobó o no)

const WALLET_REJECTIONS = ['grant_rejected', 'rejected'];

export const finishGrant = async (username: string, grantId: string | undefined, kind: GrantKind, body: Record<string, any>) => {
  const grant = await getOwnGrant(grantId, username, kind);
  if (grant.status !== 'pending') return grant;

  const interactRef = typeof body.interact_ref === 'string' ? body.interact_ref : '';
  if (!interactRef) {
    // Solo la dueña llega aquí (ruta con token), así que puede cerrar su propio permiso rechazado.
    if (typeof body.result === 'string' && WALLET_REJECTIONS.includes(body.result)) {
      await setGrant(grant.grantId, { status: 'rejected' }, { status: 'pending' });
      return { ...grant, status: 'rejected' as const };
    }
    throw new HttpError(400, 'BadRequest', 'interact_ref is required');
  }
  if (body.hash !== undefined && !verifyInteractHash(grant.clientNonce, grant.interactFinishNonce, grant.authServer, interactRef, String(body.hash))) {
    throw new HttpError(400, 'InvalidHash', 'Interaction hash does not match');
  }
  if (body.hash === undefined) console.log('grant finish without hash', grant.grantId);

  // pending → processing de forma atómica: dos llamadas no continúan el grant dos veces.
  try {
    await setGrant(grant.grantId, { status: 'processing' }, { status: 'pending' });
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException') return (await getGrant(grant.grantId)) ?? grant;
    throw error;
  }

  const pending = await grantSecrets.get<PendingSecret>(grant.grantId);
  const client = await getClient();
  let continued;
  try {
    continued = await client.grant.continue({ url: pending.continueUri, accessToken: pending.continueToken }, { interact_ref: interactRef });
  } catch (error: any) {
    console.log('grant continue rejected', error?.status, error?.description);
    await setGrant(grant.grantId, { status: 'rejected' });
    return { ...grant, status: 'rejected' as const };
  }
  if (!isFinalizedGrantWithAccessToken(continued)) {
    await setGrant(grant.grantId, { status: 'rejected' });
    return { ...grant, status: 'rejected' as const };
  }
  await grantSecrets.put(grant.grantId, { accessToken: continued.access_token.value, manageUrl: continued.access_token.manage });
  await setGrant(grant.grantId, { status: 'active' });
  return { ...grant, status: 'active' as const };
};

// ---------------------------------------------------------------- Cobrar con el grant

// Un cobro: quote nueva (llega `grant.amount`), tope del grant y outgoing payment con el token guardado.
// Si el token venció (401), se rota una vez con su URL de manejo y se reintenta.
export const chargeGrant = async (grant: GrantItem) => {
  if (grant.status !== 'active') throw new HttpError(409, 'GrantNotActive', 'The wallet has not approved this grant');
  if (grant.chargedCount >= grant.repetitions) throw new HttpError(409, 'GrantExhausted', 'All the charges of this grant were made');

  const q = await quotePayment(grant.senderWalletAddress, grant.receiverWalletAddress, { receive: grant.amount });
  if (q.debitAmount.assetCode !== grant.limitPerCharge.assetCode || BigInt(q.debitAmount.value) > BigInt(grant.limitPerCharge.value)) {
    throw new HttpError(409, 'LimitExceeded', 'Today the charge is above the approved limit');
  }

  const client = await getClient();
  let token = await grantSecrets.get<ActiveSecret>(grant.grantId);
  const create = () =>
    client.outgoingPayment.create({ url: q.sender.resourceServer, accessToken: token.accessToken }, { walletAddress: q.sender.id, quoteId: q.quoteId });
  let outgoing;
  try {
    outgoing = await create();
  } catch (error: any) {
    if (error?.status !== 401) throw error;
    const rotated = await client.token.rotate({ url: token.manageUrl, accessToken: token.accessToken });
    token = { accessToken: rotated.access_token.value, manageUrl: rotated.access_token.manage };
    await grantSecrets.put(grant.grantId, token);
    outgoing = await create();
  }
  await setGrant(grant.grantId, { chargedCount: grant.chargedCount + 1 });
  return { ...q, outgoingPaymentId: outgoing.id, failed: Boolean(outgoing.failed) };
};
