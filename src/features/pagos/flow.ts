import type { Href } from 'expo-router';

import type { Amount, WalletReturn } from '@/api/types';

// Contrato del flujo de pagos entre pantallas (11/12/26 → 28 → 30 → resultado).
// Expo Router solo lleva strings en los params: los montos viajan como JSON.

/** Qué se está autorizando en la billetera. */
export type FlowKind = 'cuota' | 'p2p' | 'recurrente';

/** Variante de la pantalla de resultado. 19 y 23 los agrega el carril de préstamos. */
export type ResultKind = 'cuota-puesta' | 'pago-hecho' | 'rechazado' | 'fallo' | 'pendiente' | 'recurrente-activada';

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

export function antesHref(params: AntesParams): Href {
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
