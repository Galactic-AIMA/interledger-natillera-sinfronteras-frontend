// POST /loans/requests/{requestId}/decision (flujo 11, ADMIN) { accepted, returnUrl } → { status }.
import { decideLoan } from './domain';
import { currentIdentity, param, parseBody, withErrors } from './shared';

export const handler = withErrors(async (event) =>
  decideLoan(currentIdentity(event).username, param(event, 'requestId'), parseBody(event)),
);
