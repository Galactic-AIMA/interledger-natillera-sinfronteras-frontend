// GET /loans/simulate?value&assetCode&assetScale&installments (flujo 10) → plan de pagos (sin guardar nada).
import { simulateLoan } from './domain';
import { currentIdentity, param, withErrors } from './shared';

export const handler = withErrors(async (event) => {
  currentIdentity(event);
  const query = Object.fromEntries(['value', 'assetCode', 'assetScale', 'installments'].map((k) => [k, param(event, k)]));
  return simulateLoan(query);
});
