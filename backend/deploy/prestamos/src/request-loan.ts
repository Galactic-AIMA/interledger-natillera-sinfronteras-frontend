// POST /loans/requests (flujo 10) { natilleraId, value, assetCode, assetScale, installments } → LoanRequest.
import { requestLoan } from './domain';
import { currentIdentity, parseBody, withErrors } from './shared';

export const handler = withErrors(async (event) => requestLoan(currentIdentity(event).username, parseBody(event)));
