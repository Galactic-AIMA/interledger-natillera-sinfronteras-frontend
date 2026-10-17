// GET /natilleras/mine[?natilleraId=] (flujo 13) → natillera de quien llama con socios, totales y últimos
// aportes. Con natilleraId, esa (si es integrante); sin él, la primera de la persona, o null.
import { getMyNatillera } from './domain';
import { currentIdentity, param, withErrors } from './shared';

export const handler = withErrors(async (event) => getMyNatillera(currentIdentity(event).username, param(event, 'natilleraId')));
