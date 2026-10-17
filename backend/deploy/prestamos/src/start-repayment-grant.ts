// POST /loans/requests/{requestId}/repayment-grant (flujo 12B) { returnUrl } → RecurringGrant.
import { startRepaymentGrant } from './domain';
import { currentIdentity, param, parseBody, withErrors } from './shared';

export const handler = withErrors(async (event) =>
  startRepaymentGrant(currentIdentity(event).username, param(event, 'requestId'), parseBody(event)),
);
