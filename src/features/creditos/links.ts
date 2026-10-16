// Carril «creditos»: rutas compartidas entre las pantallas de préstamos.
import type { Href } from 'expo-router';

import type { Amount } from '@/api';

/** 24 en modo simulación: plan de pagos de un monto y unas cuotas (todavía sin préstamo). */
export function planSimHref(value: Amount, installments: number): Href {
  return {
    pathname: '/natillera/prestamos/plan',
    params: { value: value.value, assetCode: value.assetCode, assetScale: String(value.assetScale), installments: String(installments) },
  };
}

/** 17: autorizar las cuotas de una solicitud. */
export function autorizarHref(requestId: string): Href {
  return { pathname: '/natillera/prestamos/autorizar', params: { requestId } };
}

export const INSTALLMENT_OPTIONS = [
  { value: 2, label: '2 cuotas' },
  { value: 4, label: '4 cuotas' },
  { value: 6, label: '6 cuotas' },
] as const;
