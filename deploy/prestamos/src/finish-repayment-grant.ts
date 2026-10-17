// POST /loans/repayment/{grantId}/finish (flujo 12B) { interact_ref, hash, result } → RecurringGrant.
import { finishRepaymentGrant } from './domain';
import { currentIdentity, param, parseBody, withErrors } from './shared';

export const handler = withErrors(async (event) =>
  finishRepaymentGrant(currentIdentity(event).username, param(event, 'grantId'), parseBody(event)),
);
