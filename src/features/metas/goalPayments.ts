// Pagos de colecta en curso: paymentId → meta. Vive en memoria (como los flujos de flow.ts) para que
// un enlace externo no pueda sumarle aportes a una meta; la pantalla 30 lo consulta al confirmar.
const pending = new Map<string, string>();

export function registerGoalPayment(paymentId: string, goalId: string) {
  pending.set(paymentId, goalId);
}

/** Devuelve la meta del pago y lo saca del registro (se cuenta una sola vez). */
export function takeGoalPayment(paymentId: string | undefined): string | undefined {
  if (!paymentId) return undefined;
  const goalId = pending.get(paymentId);
  pending.delete(paymentId);
  return goalId;
}
