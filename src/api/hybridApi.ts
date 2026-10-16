import type { NatilleraApi } from './client';
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
  .map((name) => name.trim())
  .filter((name): name is Method => name in httpApi && name !== 'mode');

export const realMethods: ReadonlySet<Method> = new Set<Method>([...ALWAYS_REAL, ...extra]);

// Usuario de ejemplo cuyos datos (natillera, pagos, préstamos) se ven mientras esas rutas no existan.
const DEMO_DATA_USER = 'rosa.gomez';

function pick<K extends Method>(name: K): NatilleraApi[K] {
  return (realMethods.has(name) ? httpApi[name] : mockApi[name]) as NatilleraApi[K];
}

const methods = Object.fromEntries(
  (Object.keys(httpApi) as (keyof NatilleraApi)[]).filter((name): name is Method => name !== 'mode').map((name) => [name, pick(name)]),
) as Omit<NatilleraApi, 'mode'>;

export const hybridApi: NatilleraApi = {
  ...methods,
  // La billetera solo es real cuando el pago lo inicia el back; si no, el diálogo de prueba hace de billetera.
  mode: realMethods.has('startPayment') ? 'real' : 'demo',
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
