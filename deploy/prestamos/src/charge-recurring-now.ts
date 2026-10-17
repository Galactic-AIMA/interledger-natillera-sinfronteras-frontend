// POST /recurring/{grantId}/charge-now (flujo 12): cobra ya una cuota con el permiso aprobado → Payment.
import { chargeRecurringNow } from './recurring';
import { currentIdentity, param, withErrors } from './shared';

export const handler = withErrors(async (event) => chargeRecurringNow(currentIdentity(event).username, param(event, 'grantId')));
