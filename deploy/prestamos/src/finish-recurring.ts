// POST /recurring/{grantId}/finish (flujo 12) { interact_ref, hash, result } → RecurringGrant.
import { finishRecurring } from './recurring';
import { currentIdentity, param, parseBody, withErrors } from './shared';

export const handler = withErrors(async (event) =>
  finishRecurring(currentIdentity(event).username, param(event, 'grantId'), parseBody(event)),
);
