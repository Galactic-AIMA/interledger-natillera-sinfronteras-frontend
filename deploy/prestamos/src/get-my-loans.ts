// GET /loans/mine[?natilleraId=] (flujo 13) → { request, loan } de quien llama.
import { getMyLoans } from './domain';
import { currentIdentity, param, withErrors } from './shared';

export const handler = withErrors(async (event) => getMyLoans(currentIdentity(event).username, param(event, 'natilleraId')));
