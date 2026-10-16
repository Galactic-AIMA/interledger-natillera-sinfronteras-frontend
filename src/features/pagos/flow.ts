import type { Href } from 'expo-router';

import type { Amount, WalletReturn } from '@/api/types';

// Contrato del flujo de pagos entre pantallas (11/12/26 → 28 → 30 → resultado).
// Expo Router solo lleva strings en los params: los montos viajan como JSON.

/** Qué se está autorizando en la billetera. */
// credito = permiso de las cuotas del préstamo (17 → 19); desembolso = billetera del fondo (21 → 23).
export const FLOW_KINDS = ['cuota', 'p2p', 'recurrente', 'credito', 'desembolso'] as const;
export type FlowKind = (typeof FLOW_KINDS)[number];

export function isFlowKind(value: string | undefined): value is FlowKind {
  return FLOW_KINDS.some((k) => k === value);
}

/** Variante de la pantalla de resultado. 19 y 23 los agrega el carril de préstamos. */
export type ResultKind =
  | 'cuota-puesta'
  | 'pago-hecho'
  | 'rechazado'
  | 'fallo'
  | 'pendiente'
  | 'recurrente-activada'
  | 'credito-autorizado'
  | 'prestamo-desembolsado';

/** Params de /billetera/antes (28). `id` = paymentId (cuota, p2p) o grantId (recurrente). */
export type AntesParams = {
  kind: FlowKind;
  id: string;
  redirectUrl: string;
  // Texto de la billetera simulada del modo demo.
  demoTitle: string;
  demoDetail: string;
  // Ruta de la pantalla que originó el flujo: "Intentar de nuevo" y "Volver" regresan a ella.
  origin: string;
  // Montos y contraparte que se muestran en el resultado (JSON de Amount).
  debit?: string;
  receive?: string;
  counterpart?: string;
};

/** Params de /billetera/volviendo (30): los de 28 más lo que devolvió la billetera. */
export type VolviendoParams = Omit<AntesParams, 'redirectUrl' | 'demoTitle' | 'demoDetail'> & {
  interactRef?: string;
  hash?: string;
  result?: string;
};

/** Params de /resultado. */
export type ResultadoParams = {
  tipo: ResultKind;
  // paymentId/grantId: los éxitos se toman del registro en memoria (settleFlow), no de los params.
  id?: string;
  origin: string;
  debit?: string;
  receive?: string;
  counterpart?: string;
  // Solo cuota automática (14; la 19 de préstamos lo reutiliza): tope por cobro (JSON de Amount) y repeticiones.
  limit?: string;
  repetitions?: string;
};

export function encodeAmount(value: Amount | undefined): string | undefined {
  return value ? JSON.stringify(value) : undefined;
}

export function decodeAmount(raw: string | string[] | undefined): Amount | undefined {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (!text) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null && 'value' in parsed && 'assetCode' in parsed && 'assetScale' in parsed) return parsed as Amount;
  } catch {
    // Param dañado: se trata como si no hubiera monto.
  }
  return undefined;
}

/** Los params de Expo Router no admiten `undefined`: se quitan antes de navegar. */
export function cleanParams<T extends Record<string, string | undefined>>(params: T): Record<string, string> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>;
}

// ── Seguridad (auditoría 2026-10-16) ────────────────────────────────────────────
// Expo Router abre cualquier pantalla por enlace (natillera://billetera/antes?…), así que los params
// los puede escribir otra app. Lo sensible (URL de la billetera, resultado y montos) vive en memoria,
// registrado por las pantallas de la propia sesión; los params solo identifican el flujo.

type StartedFlow = { kind: FlowKind; redirectUrl: string };
const startedFlows = new Map<string, StartedFlow>();
const settledFlows = new Map<string, Omit<ResultadoParams, 'origin'>>();

// Hosts de billetera permitidos fuera del modo demo (Test Wallet de Interledger).
const WALLET_HOST_SUFFIXES = ['interledger-test.dev'] as const;

/** La URL de consentimiento es https y de un host de billetera conocido. */
export function isTrustedWalletUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && WALLET_HOST_SUFFIXES.some((s) => hostname === s || hostname.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

/** Flujo iniciado en esta sesión (undefined si llegó por un enlace externo o la app se reinició). */
export function startedFlow(id: string | undefined): StartedFlow | undefined {
  return id ? startedFlows.get(id) : undefined;
}

/** Lo llama la pantalla 30 al terminar: guarda el resultado confirmado por el back y cierra el flujo. */
export function settleFlow(id: string, outcome: Omit<ResultadoParams, 'origin'>) {
  startedFlows.delete(id);
  settledFlows.set(id, outcome);
}

/** Resultado confirmado en esta sesión para ese id. */
export function settledOutcome(id: string | undefined) {
  return id ? settledFlows.get(id) : undefined;
}

// Rutas a las que pueden volver «Ahora no», «Intentar de nuevo» y «Volver».
const SAFE_ORIGINS = ['/natillera', '/natillera/cuota', '/natillera/recurrente', '/natillera/prestamos', '/natillera/prestamos/tesorera', '/pagar'] as const;
export type SafeOrigin = (typeof SAFE_ORIGINS)[number];

/** `origin` viene por params: solo se aceptan rutas conocidas. */
export function safeOrigin(origin: string | undefined): SafeOrigin {
  return SAFE_ORIGINS.find((o) => o === origin) ?? '/natillera';
}

/** Registra el flujo y arma la ruta a la pantalla 28. Llamarlo justo antes de navegar. */
export function antesHref(params: AntesParams): Href {
  startedFlows.set(params.id, { kind: params.kind, redirectUrl: params.redirectUrl });
  return { pathname: '/billetera/antes', params: cleanParams(params) };
}

export function volviendoHref(params: VolviendoParams): Href {
  return { pathname: '/billetera/volviendo', params: cleanParams(params) };
}

export function resultadoHref(params: ResultadoParams): Href {
  return { pathname: '/resultado', params: cleanParams(params) };
}

/** De lo que devolvió la billetera (WalletReturn) a params de 30. */
export function returnToParams(ret: WalletReturn): Pick<VolviendoParams, 'interactRef' | 'hash' | 'result'> {
  return { interactRef: ret.interactRef, hash: ret.hash, result: ret.result };
}
