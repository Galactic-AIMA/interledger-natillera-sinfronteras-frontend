import type { NatilleraApi } from './client';
import type { StartPaymentInput } from './types';
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

// Pagos reales: solo P2P (pagar a una persona y colectas de Metas). La cuota (`aporte`) necesita una
// natillera que el back todavía no tiene, así que sigue de ejemplo. Se activa con `startPayment` en
// EXPO_PUBLIC_REAL_METHODS; finish y get van al back solo para los pagos que él creó.
const realPayments = realMethods.has('startPayment');
const realPaymentIds = new Set<string>();

async function startHybridPayment(input: StartPaymentInput) {
  if (!realPayments || input.kind !== 'p2p') return methods.startPayment(input);
  let body: StartPaymentInput = input;
  if ('customWalletName' in input) {
    // Las cuentas guardadas siguen de ejemplo: el back recibe la billetera directa (extensión de P0).
    const account = (await mockApi.listAccounts()).find((a) => a.customWalletName === input.customWalletName);
    if (account) body = { kind: 'p2p', walletAddress: account.walletAddress, counterpartName: account.customWalletName, amount: input.amount };
  }
  const start = await httpApi.startPayment(body);
  realPaymentIds.add(start.paymentId);
  return start;
}

const demoFinish = demo('finishPayment');
const demoGet = demo('getPayment');

export const hybridApi: NatilleraApi = {
  ...methods,
  // 'demo' porque conviven datos de ejemplo; la billetera real se decide por pago en openWallet.
  mode: 'demo',
  startPayment: startHybridPayment,
  finishPayment: (paymentId, ret) => (realPaymentIds.has(paymentId) ? httpApi.finishPayment(paymentId, ret) : demoFinish(paymentId, ret)),
  getPayment: (paymentId) => (realPaymentIds.has(paymentId) ? httpApi.getPayment(paymentId) : demoGet(paymentId)),
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
