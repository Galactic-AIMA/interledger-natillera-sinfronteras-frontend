// Finalización de un pago (flujo 4), compartida por finish-payment (opción A: la app manda el
// interact_ref) y return-payment (opción B: la billetera vuelve al backend por https).
// Quien llama ya verificó el hash (y, en finish-payment, que el pago sea de quien llama).
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isFinalizedGrantWithAccessToken, OpenPaymentsClientError } from '@interledger/open-payments';
import { dynamo, env, getClient, type PaymentRecord } from './shared';

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

// Devuelve el pago con su estado final, o `null` si otra llamada ya lo está procesando.
export const completePayment = async (payment: PaymentRecord, interactRef: string): Promise<PaymentRecord | null> => {
  // pending → processing de forma atómica: evita crear dos outgoing payments si llegan dos llamadas.
  try {
    await dynamo.send(
      new UpdateCommand({
        TableName: env.paymentsTable,
        Key: { paymentId: payment.paymentId },
        UpdateExpression: 'SET #s = :processing',
        ConditionExpression: '#s = :pending',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':processing': 'processing', ':pending': 'pending' },
      }),
    );
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException') return null;
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
      return setStatus(payment, 'rejected');
    }
    throw error;
  }
  if (!isFinalizedGrantWithAccessToken(grant)) return setStatus(payment, 'rejected');

  try {
    const sender = await client.walletAddress.get({ url: payment.senderWalletAddress });
    const outgoing = await client.outgoingPayment.create(
      { url: sender.resourceServer, accessToken: grant.access_token.value },
      { walletAddress: sender.id, quoteId: payment.quoteId },
    );
    payment = await setStatus(payment, outgoing.failed ? 'failed' : 'completed', { outgoingPaymentId: outgoing.id });
  } catch (error) {
    console.log('outgoing payment failed', error);
    return setStatus(payment, 'failed');
  }

  if (payment.status === 'completed') await recordSaving(payment);
  return payment;
};
