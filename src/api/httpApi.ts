import * as Linking from 'expo-linking';

import { getAuthToken, normalizeWalletAddress, signIn, signOut, signUp } from './auth';
import { ApiError, type NatilleraApi } from './client';
import { config } from './config';
import type {
  LoanDecisionResult,
  LoanRequest,
  LoanSimulation,
  MyLoans,
  Natillera,
  Payment,
  QuotePreview,
  RecurringGrant,
  SavedAccount,
  StartPaymentInput,
  User,
  WalletInfo,
  WalletRedirect,
  WalletReturn,
} from './types';

// Implementación real contra API Gateway. Rutas según docs/api-contrato.md: si el back las cambia,
// se ajustan solo aquí.

type Method = 'GET' | 'POST';

// Dirección de pago pública (GET con Accept: application/json → { id, assetCode, assetScale, … }).
// Acepta la URL completa, `$ilp.interledger-test.dev/x` o solo el id de la Test Wallet.
async function lookupPublicWallet(input: string): Promise<WalletInfo> {
  const raw = input.trim();
  const url = normalizeWalletAddress(raw);
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError('No hay conexión. Revise su internet e intente de nuevo.', 0, 'network');
  }
  if (!response.ok) return { exists: false, walletAddress: raw };
  const data = (await response.json().catch(() => null)) as { id?: string; assetCode?: string; assetScale?: number } | null;
  if (!data?.assetCode) return { exists: false, walletAddress: raw };
  return { exists: true, walletAddress: data.id ?? url, assetCode: data.assetCode, assetScale: data.assetScale };
}

/** Mensajes en «usted» por status: no se muestra el `message` crudo del back (puede filtrar detalles internos). */
function friendlyError(status: number): string {
  if (status === 401 || status === 403) return 'Su sesión se cerró o no tiene permiso. Vuelva a entrar.';
  if (status === 404) return 'No encontramos lo que buscaba.';
  if (status === 409) return 'Eso ya se hizo antes.';
  if (status === 400 || status === 422) return 'Revise los datos e intente de nuevo.';
  if (status === 429) return 'Hay muchas solicitudes. Espere un momento.';
  return 'Algo falló en el servidor. Intente de nuevo.';
}

async function request<T>(method: Method, path: string, body?: unknown, auth = true): Promise<T> {
  if (!config.apiUrl) throw new ApiError('Falta configurar la API (EXPO_PUBLIC_API_URL).', 0, 'config');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getAuthToken();
    if (!token) throw new ApiError('Su sesión se cerró. Vuelva a entrar.', 401, 'unauthorized');
    headers.Authorization = `Bearer ${token}`;
  }
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('No hay conexión. Revise su internet e intente de nuevo.', 0, 'network');
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    // Auditoría 2026-10-16: un 502/HTML de API Gateway no debe reventar la app.
    if (response.ok) throw new ApiError('Recibimos una respuesta rara del servidor. Intente de nuevo.', response.status, 'bad_response');
  }
  if (!response.ok) throw new ApiError(friendlyError(response.status), response.status, (data as { error?: string } | null)?.error ?? 'error');
  return data as T;
}

// URL a la que la billetera devuelve a la persona. En el APK es natillera://retorno;
// en Expo Go cambia, por eso se le manda al back en cada inicio de pago.
const returnUrl = () => Linking.createURL('retorno');

const walletReturnBody = (ret: WalletReturn) => ({ interact_ref: ret.interactRef, hash: ret.hash, result: ret.result });

export const httpApi: NatilleraApi = {
  mode: 'real',

  // El registro no pasa por nuestra API: SignUp directo a Cognito y luego login.
  signup: async (input) => {
    await signUp(input);
    await signIn(input.username, input.password);
  },
  login: (username, password) => signIn(username, password),
  logout: () => signOut(),
  hasSession: async () => (await getAuthToken()) !== null,
  // El GET /me del back (Users-info + userId = sub) no trae displayName: se usa el usuario.
  getMe: async () => {
    const me = await request<Omit<User, 'displayName'> & { displayName?: string }>('GET', '/me');
    return { ...me, displayName: me.displayName ?? me.username };
  },
  // Con sesión, verifica el back. Sin sesión (pantalla 02, antes del SignUp) se consulta la dirección de
  // pago pública de Open Payments: no firma ni usa llaves. El back vuelve a validar la wallet en el SignUp.
  verifyWallet: async (walletAddress) => {
    if (await getAuthToken()) return request<WalletInfo>('GET', `/wallets/verify?url=${encodeURIComponent(walletAddress)}`);
    return lookupPublicWallet(walletAddress);
  },

  getMyNatillera: () => request<Natillera | null>('GET', '/natilleras/mine'),
  createNatillera: (input) => request<Natillera>('POST', '/natilleras', input),
  getInvitation: (code) => request('GET', `/invitations/${encodeURIComponent(code)}`),
  joinNatillera: (code) => request<Natillera>('POST', '/natilleras/join', { natilleraInvitation: code }),

  previewQuote: async (input: StartPaymentInput) => {
    try {
      return await request<QuotePreview>('POST', '/payments/preview', toPaymentBody(input));
    } catch (error) {
      // Si el back aún no tiene vista previa, la pantalla muestra "se calcula al confirmar".
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) return null;
      throw error;
    }
  },
  startPayment: (input) => request<WalletRedirect>('POST', '/payments', { ...toPaymentBody(input), returnUrl: returnUrl() }),
  finishPayment: async (paymentId, ret) => {
    // Opción B del contrato: el back ya finalizó y solo consultamos el estado.
    if (!ret.interactRef) return request<Payment>('GET', `/payments/${paymentId}`);
    return request<Payment>('POST', `/payments/${paymentId}/finish`, walletReturnBody(ret));
  },
  getPayment: (paymentId) => request<Payment>('GET', `/payments/${paymentId}`),
  listPayments: () => request<Payment[]>('GET', '/payments'),
  listAccounts: () => request<SavedAccount[]>('GET', '/accounts'),
  saveAccount: (walletAddress, customWalletName) => request<SavedAccount>('POST', '/accounts', { walletAddress, customWalletName }),

  startRecurring: (input) =>
    request<RecurringGrant>('POST', '/recurring', { natilleraId: input.natilleraId, author: input.onBehalfOfUserId, ...input.amount, returnUrl: returnUrl() }),
  finishRecurring: (grantId, ret) => request<RecurringGrant>('POST', `/recurring/${grantId}/finish`, walletReturnBody(ret)),
  chargeRecurringNow: (grantId) => request<Payment>('POST', `/recurring/${grantId}/charge-now`),

  simulateLoan: (value, installments) =>
    request<LoanSimulation>('GET', `/loans/simulate?value=${value.value}&assetCode=${value.assetCode}&assetScale=${value.assetScale}&installments=${installments}`),
  requestLoan: (natilleraId, value, installments) => request<LoanRequest>('POST', '/loans/requests', { natilleraId, ...value, installments }),
  startLoanRepaymentGrant: (requestId) => request<RecurringGrant>('POST', `/loans/requests/${requestId}/repayment-grant`, { returnUrl: returnUrl() }),
  finishLoanRepaymentGrant: (grantId, ret) => request<RecurringGrant>('POST', `/loans/repayment/${grantId}/finish`, walletReturnBody(ret)),
  getMyLoans: () => request<MyLoans>('GET', '/loans/mine'),
  listPendingLoanRequests: () => request<LoanRequest[]>('GET', '/loans/requests?status=pending'),
  decideLoan: (requestId, accepted) => request<LoanDecisionResult>('POST', `/loans/requests/${requestId}/decision`, { accepted, returnUrl: returnUrl() }),
};

function toPaymentBody(input: StartPaymentInput) {
  return input.kind === 'p2p'
    ? { kind: 'p2p', customWalletName: input.customWalletName, ...input.amount }
    : { kind: 'aporte', natilleraId: input.natilleraId, author: input.onBehalfOfUserId, ...input.amount };
}
