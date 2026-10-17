// POST /payments/{id}/finish — flujo 4 (finalizar pago, opción A del contrato).
// La app manda { interact_ref, hash } y recibe { paymentId, status, debitAmount, receiveAmount, … }.
// Con la opción B (return-payment) el backend ya finaliza solo; esta ruta queda como respaldo y
// es idempotente: si el pago ya terminó, devuelve su estado.
import {
  currentUsername,
  getPaymentOwnedBy,
  HttpError,
  pathPaymentId,
  parseBody,
  publicPayment,
  verifyInteractHash,
  withErrors,
} from './shared';
import { completePayment } from './complete';

export const handler = withErrors(async (event) => {
  const username = currentUsername(event);
  const paymentId = pathPaymentId(event);
  if (!paymentId) throw new HttpError(400, 'BadRequest', 'Missing payment id');
  const body = parseBody(event);
  const payment = await getPaymentOwnedBy(paymentId, username);

  if (payment.status !== 'pending') return publicPayment(payment);

  const interactRef = body.interact_ref;
  if (typeof interactRef !== 'string' || !interactRef) {
    throw new HttpError(400, 'BadRequest', 'interact_ref is required');
  }
  if (body.hash !== undefined && !verifyInteractHash(payment, interactRef, String(body.hash))) {
    throw new HttpError(400, 'InvalidHash', 'Interaction hash does not match');
  }
  if (body.hash === undefined) console.log('finish without hash', paymentId);

  const result = await completePayment(payment, interactRef);
  return publicPayment(result ?? (await getPaymentOwnedBy(paymentId, username)));
});
