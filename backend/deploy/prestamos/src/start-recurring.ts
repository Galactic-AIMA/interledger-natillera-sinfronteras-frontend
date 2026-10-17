// POST /recurring (flujo 12) { natilleraId, author?, value, assetCode, assetScale, returnUrl } → RecurringGrant.
import { startRecurring } from './recurring';
import { currentIdentity, parseBody, withErrors } from './shared';

export const handler = withErrors(async (event) => startRecurring(currentIdentity(event).username, parseBody(event)));
