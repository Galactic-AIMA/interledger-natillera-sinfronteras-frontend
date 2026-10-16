import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

import type { NatilleraApi } from './client';
import type { WalletReturn } from './types';

export type WalletOutcome = { kind: 'returned'; ret: WalletReturn } | { kind: 'cancelled' };

type WalletRequest = {
  redirectUrl: string;
  // Texto para la billetera simulada del modo demo (pantallas 13, 18, 22, 29).
  demoTitle: string;
  demoDetail: string;
};

/** Lee los parámetros con que la billetera (o el back) nos devuelve a natillera://retorno. */
export function parseWalletReturn(url: string): WalletReturn {
  const { queryParams } = Linking.parse(url);
  const get = (key: string) => {
    const value = queryParams?.[key];
    return typeof value === 'string' ? value : undefined;
  };
  return { paymentId: get('paymentId'), grantId: get('grantId'), interactRef: get('interact_ref'), hash: get('hash'), result: get('result') };
}

/**
 * Abre la billetera para que la persona apruebe y espera a que vuelva.
 * Modo real: navegador del sistema con openAuthSessionAsync. Modo demo: un diálogo hace de billetera.
 */
export async function openWallet(api: NatilleraApi, req: WalletRequest): Promise<WalletOutcome> {
  if (api.mode === 'demo' && Platform.OS === 'web') {
    // react-native-web no implementa Alert con botones: sin esto la promesa nunca se resolvería.
    const approved = window.confirm(`Billetera de prueba · ${req.demoTitle}

${req.demoDetail}

Aceptar = Aprobar · Cancelar = Rechazar`);
    return { kind: 'returned', ret: approved ? { result: 'ok', interactRef: 'demo' } : { result: 'grant_rejected' } };
  }
  if (api.mode === 'demo') {
    return new Promise((resolve) => {
      Alert.alert(`Billetera de prueba · ${req.demoTitle}`, req.demoDetail, [
        { text: 'Rechazar', style: 'destructive', onPress: () => resolve({ kind: 'returned', ret: { result: 'grant_rejected' } }) },
        { text: 'Aprobar', onPress: () => resolve({ kind: 'returned', ret: { result: 'ok', interactRef: 'demo' } }) },
      ]);
    });
  }
  const result = await WebBrowser.openAuthSessionAsync(req.redirectUrl, Linking.createURL('retorno'));
  if (result.type !== 'success') return { kind: 'cancelled' };
  return { kind: 'returned', ret: parseWalletReturn(result.url) };
}

/** Consulta el pago hasta que quede en un estado final (pantalla 30). */
export async function waitForFinalPayment(api: NatilleraApi, paymentId: string, timeoutMs = 45_000) {
  const started = Date.now();
  for (;;) {
    const payment = await api.getPayment(paymentId);
    if (payment.status !== 'pending' || Date.now() - started > timeoutMs) return payment;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
