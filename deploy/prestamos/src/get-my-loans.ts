// GET /loans/mine (flujo 13) → { request, loan } de quien llama.
import { getMyLoans } from './domain';
import { currentIdentity, withErrors } from './shared';

export const handler = withErrors(async (event) => getMyLoans(currentIdentity(event).username));
