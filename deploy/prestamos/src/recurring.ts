// Cuota automática (flujo 12): la persona aprueba una vez en su billetera que la natillera le cobre la
// cuota cada mes, con tope por cobro, y el backend cobra con ese permiso.
//   POST /recurring                       { natilleraId, author?, value, assetCode, assetScale, returnUrl } → RecurringGrant
//   POST /recurring/{grantId}/finish      { interact_ref, hash, result }                                    → RecurringGrant
//   POST /recurring/{grantId}/charge-now  (cobra ya una cuota; para la demo y para un cobro programado)    → Payment
import { randomUUID } from 'node:crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, env, HttpError, type Amount } from './shared';
import { getNatillera, parseFundAmount } from './domain';
import { chargeGrant, finishGrant, getOwnGrant, publicGrant, startGrant } from './grants';
import { checkWalletUrl, opEnv, validateReturnUrl } from './op';

// Cobros hasta diciembre, contando el mes actual (la natillera reparte en diciembre).
const repetitionsUntilDecember = () => Number(process.env.RECURRING_REPETITIONS || 12 - new Date().getUTCMonth());

export const startRecurring = async (username: string, body: Record<string, any>) => {
  if (typeof body.natilleraId !== 'string' || !body.natilleraId) throw new HttpError(400, 'BadRequest', 'natilleraId is required');
  const returnUrl = validateReturnUrl(body.returnUrl);
  const natillera = await getNatillera(body.natilleraId);
  if (!natillera) throw new HttpError(404, 'NatilleraNotFound', 'Natillera not found');
  if (!natillera.integrants.includes(username)) throw new HttpError(403, 'Forbidden', 'You are not a member of this natillera');
  const onBehalfOf = typeof body.author === 'string' && body.author && body.author !== username ? body.author : undefined;
  if (onBehalfOf && !natillera.integrants.includes(onBehalfOf)) throw new HttpError(400, 'BadRequest', 'author is not a member of this natillera');
  const amount = parseFundAmount(body, natillera);

  const { item, redirectUrl } = await startGrant({
    username,
    kind: 'recurring',
    natilleraId: natillera.natilleraId,
    onBehalfOf,
    amount,
    repetitions: repetitionsUntilDecember(),
    receiverUrl: checkWalletUrl(natillera.walletAddress),
    receiverName: natillera.natilleraName ?? 'Natillera',
    returnUrl,
  });
  return publicGrant(item, redirectUrl);
};

export const finishRecurring = async (username: string, grantId: string | undefined, body: Record<string, any>) =>
  publicGrant(await finishGrant(username, grantId, 'recurring', body));

// Cobra una cuota con el permiso y la deja registrada igual que un aporte normal: en el historial de
// pagos (`natillera-payments`, la tabla de David) y en los aportes de la natillera (`natillera-records`).
export const chargeRecurringNow = async (username: string, grantId: string | undefined) => {
  const grant = await getOwnGrant(grantId, username, 'recurring');
  const charge = await chargeGrant(grant);
  const now = new Date().toISOString();
  const payment = {
    paymentId: randomUUID(),
    author: username,
    kind: 'aporte' as const,
    status: charge.failed ? ('failed' as const) : ('completed' as const),
    counterpartName: grant.receiverName,
    natilleraId: grant.natilleraId,
    onBehalfOf: grant.onBehalfOf,
    senderWalletAddress: charge.sender.id,
    receiverWalletAddress: charge.receiver.id,
    incomingPaymentId: charge.incomingPaymentId,
    quoteId: charge.quoteId,
    outgoingPaymentId: charge.outgoingPaymentId,
    grantId: grant.grantId,
    debitAmount: charge.debitAmount,
    receiveAmount: charge.receiveAmount,
    createdAt: now,
    updatedAt: now,
  };
  await dynamo.send(new PutCommand({ TableName: opEnv.paymentsTable, Item: payment }));
  if (payment.status === 'completed') await recordSaving(payment.natilleraId, payment.onBehalfOf ?? username, username, charge.receiveAmount, payment.paymentId);
  return {
    paymentId: payment.paymentId,
    kind: payment.kind,
    status: payment.status,
    counterpartName: payment.counterpartName,
    natilleraId: payment.natilleraId,
    debitAmount: payment.debitAmount,
    receiveAmount: payment.receiveAmount,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
};

// Misma fila que escribe complete.ts (de pagos) al completar un aporte.
const recordSaving = async (natilleraId: string, author: string, paymentAuthor: string, amount: Amount, paymentId: string) => {
  try {
    await dynamo.send(
      new PutCommand({
        TableName: env.recordsTable,
        Item: { natilleraId, id: Date.now(), author, paymentAuthor, amount, payments: [paymentId], createdAt: new Date().toISOString() },
      }),
    );
  } catch (error) {
    console.log('natillera-records put failed (payment stays completed)', error);
  }
};
