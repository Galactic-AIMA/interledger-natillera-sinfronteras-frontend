// GET /loans/requests?status=pending[&natilleraId=] (flujo 13) → pendientes de sus natilleras (solo ADMIN).
import { listPendingRequests } from './domain';
import { currentIdentity, param, withErrors } from './shared';

export const handler = withErrors(async (event) => listPendingRequests(currentIdentity(event).username, param(event, 'natilleraId')));
