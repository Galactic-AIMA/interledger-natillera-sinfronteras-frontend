import * as Linking from 'expo-linking';

import { getAuthToken, getIdTokenClaims, normalizeWalletAddress, signIn, signOut, signUp } from './auth';
import { ApiError, type NatilleraApi } from './client';
import { config } from './config';
import { createGoalStore } from './goalStore';
import { logEvent, pathOnly } from './devLog';
import type {
  LoanDecisionResult,
  LoanRequest,
  LoanSimulation,
  MyLoans,
  Natillera,
  NatilleraSummary,
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
  const label = `GET ${pathOnly(url)}`;
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    logEvent({ kind: 'billetera', label, ok: false, ms: Date.now() - started, detail: 'sin conexión' });
    throw new ApiError('No hay conexión. Revise su internet e intente de nuevo.', 0, 'network');
  }
  logEvent({ kind: 'billetera', label, ok: response.ok, status: response.status, ms: Date.now() - started });
  if (!response.ok) return { exists: false, walletAddress: raw };
  const data = (await response.json().catch(() => null)) as { id?: string; assetCode?: string; assetScale?: number } | null;
  if (!data?.assetCode) return { exists: false, walletAddress: raw };
  return { exists: true, walletAddress: data.id ?? url, assetCode: data.assetCode, assetScale: data.assetScale };
}

// GET /me del back devuelve la fila de `user-info` (llave `source` = username) más `userId`.
type BackUser = Partial<User> & { source?: string };

function toUser(data: BackUser, claims: Record<string, string> | null): User {
  const username = data.username ?? data.source ?? claims?.['cognito:username'] ?? '';
  return {
    userId: data.userId ?? claims?.sub ?? '',
    username,
    displayName: data.displayName ?? username,
    email: data.email ?? claims?.email ?? '',
    phone: data.phone ?? claims?.phone_number ?? '',
    walletAddress: data.walletAddress ?? claims?.['custom:walletId'] ?? '',
    assetCode: data.assetCode ?? '',
    assetScale: data.assetScale ?? 2,
  };
}

// Mientras no haya URL del API, el perfil sale del IdToken y la moneda de la wallet pública.
async function profileFromToken(): Promise<User> {
  const claims = await getIdTokenClaims();
  if (!claims) throw new ApiError('Su sesión se cerró. Vuelva a entrar.', 401, 'unauthorized');
  const walletId = claims['custom:walletId'] ?? '';
  const wallet = walletId ? await lookupPublicWallet(walletId).catch(() => null) : null;
  return toUser({ walletAddress: wallet?.exists ? wallet.walletAddress : walletId, assetCode: wallet?.assetCode, assetScale: wallet?.assetScale }, claims);
}

/** Mensajes en «usted» por status: no se muestra el `message` crudo del back (puede filtrar detalles internos). */
function friendlyError(status: number, backMessage?: string): string {
  // Open Payments no encontró la billetera de destino (p. ej. una meta con una dirección que no existe).
  if (backMessage?.includes('Could not get wallet address')) return 'La billetera de quien recibe no existe.';
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
  const label = `${method} ${pathOnly(path)}`;
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    logEvent({ kind: 'api', label, ok: false, ms: Date.now() - started, detail: 'sin conexión' });
    throw new ApiError('No hay conexión. Revise su internet e intente de nuevo.', 0, 'network');
  }
  const ms = Date.now() - started;
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    // Auditoría 2026-10-16: un 502/HTML de API Gateway no debe reventar la app.
    if (response.ok) throw new ApiError('Recibimos una respuesta rara del servidor. Intente de nuevo.', response.status, 'bad_response');
  }
  // API REST sin proxy (VTL): si faltan las respuestas de integración, un error llega como 200 con
  // {"errorMessage": "[400] {\"error\":…}"}. Se recupera el status real para no tomarlo como éxito.
  const lambdaError = (data as { errorMessage?: unknown } | null)?.errorMessage;
  if (response.ok && typeof lambdaError === 'string') {
    const match = /^\[(\d{3})\]\s*(.*)$/s.exec(lambdaError);
    const status = match ? Number(match[1]) : 502;
    let parsed: { error?: string; message?: string } = {};
    try {
      parsed = JSON.parse(match?.[2] ?? '') as typeof parsed;
    } catch {
      parsed = { message: match?.[2] ?? lambdaError };
    }
    logEvent({ kind: 'api', label, ok: false, status, ms, detail: [parsed.error, parsed.message].filter(Boolean).join(': ') || 'error de Lambda' });
    throw new ApiError(friendlyError(status, parsed.message), status, parsed.error ?? 'error');
  }
  // Lambda en modo proxy detrás de una integración sin proxy: la respuesta entera de la Lambda llega
  // como 200 con {"statusCode": 401, "body": "{…}"} (visto el 2026-10-16). Se desenvuelve.
  const wrapped = data as { statusCode?: unknown; body?: unknown } | null;
  if (response.ok && typeof wrapped?.statusCode === 'number' && typeof wrapped.body === 'string') {
    const status = wrapped.statusCode;
    let inner: unknown = null;
    try {
      inner = JSON.parse(wrapped.body) as unknown;
    } catch {
      inner = { message: wrapped.body };
    }
    if (status >= 400) {
      const innerError = (inner as { error?: string; message?: string } | null) ?? {};
      logEvent({ kind: 'api', label, ok: false, status, ms, detail: `${[innerError.error, innerError.message].filter(Boolean).join(': ')} (respuesta proxy envuelta en 200)` });
      throw new ApiError(friendlyError(status, innerError.message), status, innerError.error ?? 'error');
    }
    logEvent({ kind: 'api', label, ok: true, status, ms, detail: 'respuesta proxy envuelta en 200' });
    return inner as T;
  }
  const backError = (data as { error?: string; message?: string } | null) ?? null;
  logEvent({ kind: 'api', label, ok: response.ok, status: response.status, ms, detail: response.ok ? undefined : [backError?.error, backError?.message].filter(Boolean).join(': ') || undefined });
  if (!response.ok) throw new ApiError(friendlyError(response.status, backError?.message), response.status, backError?.error ?? 'error');
  return data as T;
}

// URL a la que la billetera devuelve a la persona. En el APK es natillera://retorno;
// en Expo Go cambia, por eso se le manda al back en cada inicio de pago.
const returnUrl = () => Linking.createURL('retorno');

const walletReturnBody = (ret: WalletReturn) => ({ interact_ref: ret.interactRef, hash: ret.hash, result: ret.result });

const goals = createGoalStore();

export const httpApi: NatilleraApi = {
  mode: 'real',

  // El registro no pasa por nuestra API: SignUp directo a Cognito y luego login.
  // Solo SignUp: la pantalla 02 entra después con login(). Si aquí también se entrara y eso fallara,
  // la 02 mostraría error con la cuenta ya creada y al reintentar saldría "Ese usuario ya existe".
  signup: (input) => signUp(input),
  login: (username, password) => signIn(username, password),
  logout: () => signOut(),
  hasSession: async () => (await getAuthToken()) !== null,
  // El GET /me del back trae la fila de Users-info (sin displayName): toUser lo completa con el usuario.
  getMe: async () => {
    if (!config.apiUrl) return profileFromToken();
    try {
      return toUser(await request<BackUser>('GET', '/me'), await getIdTokenClaims());
    } catch (error) {
      // API REST: 403 "Missing Authentication Token" = la ruta todavía no está desplegada.
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return profileFromToken();
      throw error;
    }
  },
  // Con sesión, verifica el back. Sin sesión (pantalla 02, antes del SignUp) se consulta la dirección de
  // pago pública de Open Payments: no firma ni usa llaves. El back vuelve a validar la wallet en el SignUp.
  verifyWallet: async (walletAddress) => {
    if (config.apiUrl && (await getAuthToken())) {
      try {
        return await request<WalletInfo>('GET', `/wallets/verify?url=${encodeURIComponent(walletAddress)}`);
      } catch (error) {
        // El back aún no publica /wallets/verify: se usa la consulta pública.
        if (!(error instanceof ApiError && (error.status === 403 || error.status === 404))) throw error;
      }
    }
    return lookupPublicWallet(walletAddress);
  },

  getMyNatillera: (natilleraId) =>
    request<Natillera | null>('GET', natilleraId ? `/natilleras/mine?natilleraId=${encodeURIComponent(natilleraId)}` : '/natilleras/mine'),
  // GET /natilleras es del back de varias natilleras. Si aún no está desplegado (403 en el API REST),
  // la lista sale de la única natillera que devuelve /natilleras/mine: el selector no aparece.
  listMyNatilleras: async () => {
    try {
      return await request<NatilleraSummary[]>('GET', '/natilleras');
    } catch (error) {
      if (!(error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405))) throw error;
      const only = await request<Natillera | null>('GET', '/natilleras/mine');
      return only ? [toSummary(only)] : [];
    }
  },
  createNatillera: (input) => request<Natillera>('POST', '/natilleras', input),
  getInvitation: (code) => request('GET', `/invitations/${encodeURIComponent(code)}`),
  joinNatillera: (code) => request<Natillera>('POST', '/natilleras/join', { natilleraInvitation: code }),

  previewQuote: async (input: StartPaymentInput) => {
    try {
      return await request<QuotePreview>('POST', '/payments/preview', toPaymentBody(input));
    } catch (error) {
      // Si el back aún no tiene vista previa, la pantalla muestra "se calcula al confirmar".
      // API REST: una ruta que no existe responde 403 (pedido de Henry, 17:15).
      if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405)) return null;
      throw error;
    }
  },
  async startPayment(input) {
    const start = await request<WalletRedirect>('POST', config.paymentsStartPath, { ...toPaymentBody(input), returnUrl: returnUrl() });
    // Sin estos dos campos no hay billetera que abrir: mejor un error claro que una pantalla en blanco.
    if (!start?.paymentId || !start.redirectUrl) {
      logEvent({ kind: 'api', label: `POST ${pathOnly(config.paymentsStartPath)}`, ok: false, detail: 'respuesta sin paymentId o redirectUrl' });
      throw new ApiError('Recibimos una respuesta rara del servidor. Intente de nuevo.', 502, 'bad_response');
    }
    return start;
  },
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

  // Metas: el back aún no las guarda; viven en este celular mientras la app esté abierta.
  listGoals: async () => goals.list(),
  getGoal: async (goalId) => goals.get(goalId),
  createGoal: async (input) => goals.create(input, 'Usted'),
  addGoalContribution: async (goalId, input) => goals.contribute(goalId, input, 'Usted'),
};

function toSummary(n: Natillera): NatilleraSummary {
  return { natilleraId: n.natilleraId, natilleraName: n.natilleraName, isAdmin: n.isAdmin, membersCount: n.members.length, asset: n.asset, quota: n.quota };
}

function toPaymentBody(input: StartPaymentInput) {
  if (input.kind === 'aporte') return { kind: 'aporte', natilleraId: input.natilleraId, author: input.onBehalfOfUserId, ...input.amount };
  // Colectas de Metas: el back acepta `walletAddress` en lugar de una cuenta guardada (docs/API-PAGOS.md del back).
  if ('walletAddress' in input) return { kind: 'p2p', walletAddress: input.walletAddress, ...input.amount };
  return { kind: 'p2p', customWalletName: input.customWalletName, ...input.amount };
}
