// GET /natilleras (flujo 13) → resumen de todas las natilleras de quien llama, para el selector de la app.
import { listMyNatilleras } from './domain';
import { currentIdentity, withErrors } from './shared';

export const handler = withErrors(async (event) => listMyNatilleras(currentIdentity(event).username));
