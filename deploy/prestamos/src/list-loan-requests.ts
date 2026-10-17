// GET /loans/requests?status=pending (flujo 13) → solicitudes pendientes de la natillera (solo ADMIN).
import { listPendingRequests } from './domain';
import { currentIdentity, withErrors } from './shared';

export const handler = withErrors(async (event) => listPendingRequests(currentIdentity(event).username));
