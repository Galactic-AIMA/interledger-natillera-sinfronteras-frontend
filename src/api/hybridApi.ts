import type { NatilleraApi } from './client';
import type { Payment, StartPaymentInput } from './types';
import { logEvent } from './devLog';
import { httpApi } from './httpApi';
import { mockApi } from './mockApi';

// Modo híbrido (decisión de Camilo, 2026-10-16): lo que el back ya tiene va real y el resto sigue con
// datos de ejemplo, para que todas las pantallas funcionen mientras el back sale por partes.
// Para pasar una función a real cuando su ruta exista: agregarla en EXPO_PUBLIC_REAL_METHODS
// (separadas por coma), p. ej. `startPayment,finishPayment,getPayment`.
const ALWAYS_REAL = ['signup', 'login', 'logout', 'hasSession', 'getMe', 'verifyWallet'] as const;

type Method = Exclude<keyof NatilleraApi, 'mode'>;

const extra = (process.env.EXPO_PUBLIC_REAL_METHODS ?? '')
  .split(',')
  .map((name: string) => name.trim())
  .filter((name: string): name is Method => name in httpApi && name !== 'mode');

export const realMethods: ReadonlySet<Method> = new Set<Method>([...ALWAYS_REAL, ...extra]);

// Usuario de ejemplo cuyos datos (natillera, pagos, préstamos) se ven mientras esas rutas no existan.
const DEMO_DATA_USER = 'rosa.gomez';

type AnyMethod = (...args: unknown[]) => Promise<unknown>;

// Lo que todavía es de ejemplo también queda en el registro técnico, para saber qué no tocó el back.
function demo<K extends Method>(name: K): NatilleraApi[K] {
  const fn = mockApi[name] as unknown as AnyMethod;
  const wrapped: AnyMethod = async (...args) => {
    const started = Date.now();
    try {
      const result = await fn.apply(mockApi, args);
      logEvent({ kind: 'demo', label: name, ok: true, ms: Date.now() - started });
      return result;
    } catch (error) {
      logEvent({ kind: 'demo', label: name, ok: false, ms: Date.now() - started, detail: error instanceof Error ? error.message : undefined });
      throw error;
    }
  };
  return wrapped as unknown as NatilleraApi[K];
}

function pick<K extends Method>(name: K): NatilleraApi[K] {
  return realMethods.has(name) ? httpApi[name] : demo(name);
}

const methods = Object.fromEntries(
  (Object.keys(httpApi) as (keyof NatilleraApi)[]).filter((name): name is Method => name !== 'mode').map((name) => [name, pick(name)]),
) as Omit<NatilleraApi, 'mode'>;

// Pagos reales: P2P (pagar a una persona y colectas de Metas) con `startPayment` en EXPO_PUBLIC_REAL_METHODS.
// La cuota (`aporte`) va real solo si la natillera también lo es (`getMyNatillera`): el back exige que la
// natillera exista y que quien paga sea integrante. finish y get van al back solo para los pagos que él creó.
const realPayments = realMethods.has('startPayment');
const realNatillera = realMethods.has('getMyNatillera');
// Con las cuentas guardadas en el back, el pago va por `customWalletName` y el back busca la billetera.
const realAccounts = realMethods.has('listAccounts');
// Mismo criterio para iniciar el pago y para la vista previa.
const goesReal = (input: StartPaymentInput) => realPayments && (input.kind === 'p2p' || (input.kind === 'aporte' && realNatillera));
const realPaymentIds = new Set<string>();
// El back devuelve counterpartName vacío cuando se paga a una billetera directa (`walletAddress`):
// el nombre que la persona escribió se recuerda aquí para mostrarlo en el resultado y el historial.
const realNames = new Map<string, string>();
const withName = (p: Payment): Payment => (p.counterpartName ? p : { ...p, counterpartName: realNames.get(p.paymentId) ?? 'Billetera externa' });

// Vista previa: con `previewQuote` real va al back (si la ruta aún no existe, httpApi devuelve null).
// Sin ella, para un pago real la de ejemplo mostraría tasas inventadas: null = «se calcula al confirmar»
// y la 28 pinta la quote real.
const demoPreview = demo('previewQuote');
const previewHybrid = (input: StartPaymentInput) =>
  realMethods.has('previewQuote') ? httpApi.previewQuote(input) : goesReal(input) ? Promise.resolve(null) : demoPreview(input);

async function startHybridPayment(input: StartPaymentInput) {
  if (!goesReal(input)) return methods.startPayment(input);
  let body: StartPaymentInput = input;
  if (input.kind === 'p2p' && 'customWalletName' in input && !realAccounts) {
    // Las cuentas guardadas siguen de ejemplo: el back recibe la billetera directa (extensión de P0).
    const account = (await mockApi.listAccounts()).find((a) => a.customWalletName === input.customWalletName);
    if (account) body = { kind: 'p2p', walletAddress: account.walletAddress, counterpartName: account.customWalletName, amount: input.amount };
  }
  const start = await httpApi.startPayment(body);
  realPaymentIds.add(start.paymentId);
  if ('counterpartName' in body) realNames.set(start.paymentId, body.counterpartName);
  return start;
}

const demoFinish = demo('finishPayment');
const demoGet = demo('getPayment');
const demoList = demo('listPayments');

// Historial: los pagos reales (GET /payments) encima de los de ejemplo. Si la ruta aún no está
// desplegada (403) o falla, se muestran solo los de ejemplo; el error queda en el registro técnico.
async function listHybridPayments() {
  const sample = await demoList();
  if (!realPayments) return sample;
  try {
    const real = (await httpApi.listPayments()).map(withName);
    return [...real, ...sample].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return sample;
  }
}

export const hybridApi: NatilleraApi = {
  ...methods,
  // 'demo' porque conviven datos de ejemplo; la billetera real se decide por pago en openWallet.
  mode: 'demo',
  // La lista va con la natillera: si la natillera es real, la lista también (aunque no esté en la variable).
  listMyNatilleras: realNatillera ? httpApi.listMyNatilleras : demo('listMyNatilleras'),
  previewQuote: previewHybrid,
  startPayment: startHybridPayment,
  finishPayment: (paymentId, ret) => (realPaymentIds.has(paymentId) ? httpApi.finishPayment(paymentId, ret).then(withName) : demoFinish(paymentId, ret)),
  getPayment: (paymentId) => (realPaymentIds.has(paymentId) ? httpApi.getPayment(paymentId).then(withName) : demoGet(paymentId)),
  listPayments: listHybridPayments,
  async login(username, password) {
    await httpApi.login(username, password);
    mockApi.switchUser(DEMO_DATA_USER);
  },
  async logout() {
    await httpApi.logout();
    await mockApi.logout();
  },
  async hasSession() {
    const has = await httpApi.hasSession();
    if (has) mockApi.switchUser(DEMO_DATA_USER);
    return has;
  },
  async signup(input) {
    await httpApi.signup(input);
    mockApi.switchUser(DEMO_DATA_USER);
  },
};

export const isHybrid = (api: NatilleraApi) => api === hybridApi;
