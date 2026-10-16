// POST /payments/{id}/finish — flujo 4 (finalizar pago, opción A del contrato).
// La billetera devuelve a `returnUrl?paymentId=…&interact_ref=…&hash=…`; la app manda aquí
// { interact_ref, hash } y recibe { paymentId, status, debitAmount, receiveAmount, … }.
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isFinalizedGrantWithAccessToken, OpenPaymentsClientError } from '@interledger/open-payments';
import {
  currentUsername,
  dynamo,
  env,
  getClient,
  getPaymentOwnedBy,
  HttpError,
  pathPaymentId,
  parseBody,
  publicPayment,
  verifyInteractHash,
  withErrors,
  type PaymentRecord,
} from './shared';

const RECORDS_TABLE = process.env.NATILLERA_RECORDS_TABLE; // opcional (flujo 9): si no está, no se registra el aporte

const setStatus = async (p: PaymentRecord, status: PaymentRecord['status'], extra: Record<string, unknown> = {}) => {
  const updatedAt = new Date().toISOString();
  const names: Record<string, string> = { '#s': 'status', '#u': 'updatedAt' };
  const values: Record<string, unknown> = { ':s': status, ':u': updatedAt };
  const sets = ['#s = :s', '#u = :u'];
  for (const [key, value] of Object.entries(extra)) {
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    sets.push(`#${key} = :${key}`);
  }
  // El token de continuación ya no sirve: se borra.
  await dynamo.send(
    new UpdateCommand({
      TableName: env.paymentsTable,
      Key: { paymentId: p.paymentId },
      UpdateExpression: `SET ${sets.join(', ')} REMOVE continueToken`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
  return { ...p, status, updatedAt, ...extra } as PaymentRecord;
};

const recordSaving = async (p: PaymentRecord) => {
  if (!RECORDS_TABLE || p.kind !== 'aporte' || !p.natilleraId) return;
  try {
    await dynamo.send(
      new PutCommand({
        TableName: RECORDS_TABLE,
        Item: {
          natilleraId: p.natilleraId,
          id: Date.now(),
          author: p.onBehalfOf || p.author,
          paymentAuthor: p.author,
          amount: p.receiveAmount,
          payments: [p.paymentId],
          createdAt: new Date().toISOString(),
        },
      }),
    );
  } catch (error) {
    console.log('natillera-records put failed (payment stays completed)', error);
  }
};

export const handler = withErrors(async (event) => {
  const username = currentUsername(event);
  const paymentId = pathPaymentId(event);
  if (!paymentId) throw new HttpError(400, 'BadRequest', 'Missing payment id');
  const body = parseBody(event);
  let payment = await getPaymentOwnedBy(paymentId, username);

  // Idempotente: si ya terminó (o se está procesando), se devuelve el estado actual.
  if (payment.status !== 'pending') return publicPayment(payment);

  const interactRef = body.interact_ref;
  if (typeof interactRef !== 'string' || !interactRef) {
    throw new HttpError(400, 'BadRequest', 'interact_ref is required');
  }
  if (body.hash !== undefined && !verifyInteractHash(payment, interactRef, String(body.hash))) {
    throw new HttpError(400, 'InvalidHash', 'Interaction hash does not match');
  }
  if (body.hash === undefined) console.log('finish without hash', paymentId);

  // pending → processing de forma atómica: evita crear dos outgoing payments si llegan dos llamadas.
  try {
    await dynamo.send(
      new UpdateCommand({
        TableName: env.paymentsTable,
        Key: { paymentId },
        UpdateExpression: 'SET #s = :processing',
        ConditionExpression: '#s = :pending',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':processing': 'processing', ':pending': 'pending' },
      }),
    );
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException') {
      return publicPayment(await getPaymentOwnedBy(paymentId, username));
    }
    throw error;
  }

  const client = await getClient();

  let grant;
  try {
    grant = await client.grant.continue(
      { url: payment.continueUri, accessToken: payment.continueToken },
      { interact_ref: interactRef },
    );
  } catch (error) {
    if (error instanceof OpenPaymentsClientError) {
      console.log('grant continue rejected', error.status, error.description);
      payment = await setStatus(payment, 'rejected');
      return publicPayment(payment);
    }
    throw error;
  }
  if (!isFinalizedGrantWithAccessToken(grant)) {
    payment = await setStatus(payment, 'rejected');
    return publicPayment(payment);
  }

  try {
    const sender = await client.walletAddress.get({ url: payment.senderWalletAddress });
    const outgoing = await client.outgoingPayment.create(
      { url: sender.resourceServer, accessToken: grant.access_token.value },
      { walletAddress: sender.id, quoteId: payment.quoteId },
    );
    payment = await setStatus(payment, outgoing.failed ? 'failed' : 'completed', { outgoingPaymentId: outgoing.id });
  } catch (error) {
    console.log('outgoing payment failed', error);
    payment = await setStatus(payment, 'failed');
    return publicPayment(payment);
  }

  if (payment.status === 'completed') await recordSaving(payment);
  return publicPayment(payment);
});
