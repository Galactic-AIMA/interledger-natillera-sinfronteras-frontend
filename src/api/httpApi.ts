import * as Linking from 'expo-linking';

import { getAuthToken, signIn, signOut } from './auth';
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
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const message = (data as { message?: string } | null)?.message;
    throw new ApiError(message ?? 'Algo falló. Intente de nuevo.', response.status, (data as { error?: string } | null)?.error ?? 'error');
  }
  return data as T;
}

// URL a la que la billetera devuelve a la persona. En el APK es natillera://retorno;
// en Expo Go cambia, por eso se le manda al back en cada inicio de pago.
const returnUrl = () => Linking.createURL('retorno');

const walletReturnBody = (ret: WalletReturn) => ({ interact_ref: ret.interactRef, hash: ret.hash, result: ret.result });

export const httpApi: NatilleraApi = {
  mode: 'real',

  signup: (input) => request<void>('POST', '/signup', input, false),
  login: (username, password) => signIn(username, password),
  logout: () => signOut(),
  hasSession: async () => (await getAuthToken()) !== null,
  getMe: () => request<User>('GET', '/me'),
  verifyWallet: (walletAddress) => request<WalletInfo>('GET', `/wallets/verify?url=${encodeURIComponent(walletAddress)}`),

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
