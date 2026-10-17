import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { openWallet, useApi, useMe, type NatilleraApi } from '@/api';
import { AppText, Button, Card, InfoRow, Screen } from '@/components';
import { decodeAmount, isFlowKind, isTrustedWalletUrl, resultadoHref, returnToParams, safeOrigin, startedFlow, volviendoHref, type FlowKind } from '@/features/pagos/flow';
import { PasoAntes } from '@/features/pagos/flujo/PasoAntes';
import { param } from '@/features/pagos/flujo/params';
import { Reveal } from '@/features/pagos/flujo/Reveal';
import { space } from '@/theme';

function asFlowKind(value: string | undefined): FlowKind | undefined {
  return isFlowKind(value) ? value : undefined;
}

// Flujos que mueven plata con un solo pago (los permisos recurrentes no: si se cierran, no hay cobro).
const PAYMENT_KINDS: readonly FlowKind[] = ['cuota', 'p2p', 'desembolso'];

/**
 * La persona cerró la billetera sin volver a la app. Puede haber aprobado igual: la Test Wallet muestra
 * «Internal Server Error» aunque el back ya haya finalizado el pago (aviso de Ciro, 2026-10-16).
 * Se consulta el estado unos segundos; `true` si el pago ya no está pendiente.
 */
async function settledAfterClose(api: NatilleraApi, paymentId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      if ((await api.getPayment(paymentId)).status !== 'pending') return true;
    } catch {
      // Sin respuesta del back no se sabe nada: se reintenta y, si sigue así, se cierra como antes.
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

/** "https://ilp.interledger-test.dev/rosa" → "$ilp.interledger-test.dev/rosa", como la muestra la Test Wallet. */
function walletLabel(address: string): string {
  return address.trim().replace(/\/+$/, '').replace(/^https:\/\//i, '$');
}

// 28 · Antes de la billetera
export default function ScreenBilleteraAntes() {
  const api = useApi();
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const kind = asFlowKind(param(raw.kind));
  const id = param(raw.id);
  // La URL de la billetera sale del registro de la sesión, nunca del param (un enlace podría traer phishing).
  const flow = startedFlow(id);
  const redirectUrl = flow && flow.kind === kind && (api.mode === 'demo' || isTrustedWalletUrl(flow.redirectUrl)) ? flow.redirectUrl : undefined;
  const origin = safeOrigin(param(raw.origin));
  const debit = decodeAmount(raw.debit);
  const receive = decodeAmount(raw.receive);
  const counterpart = param(raw.counterpart);
  const [busy, setBusy] = useState(false);
  // El permiso se pide con la billetera del registro: si la Test Wallet está abierta con otra cuenta,
  // muestra «Access to the given resource is forbidden» (visto en el celular, 2026-10-17).
  const me = useMe();
  const myWallet = api.mode === 'demo' ? '' : (me.data?.walletAddress ?? '');

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace(origin);
  }

  async function goToWallet() {
    if (busy || !kind || !id || !redirectUrl) return;
    setBusy(true);
    try {
      const outcome = await openWallet(api, {
        redirectUrl,
        demoTitle: param(raw.demoTitle) ?? 'Billetera',
        demoDetail: param(raw.demoDetail) ?? '',
      });
      if (outcome.kind === 'cancelled') {
        const realWallet = /^https:\/\//i.test(redirectUrl);
        if (realWallet && PAYMENT_KINDS.includes(kind) && (await settledAfterClose(api, id))) {
          // La 30 consulta el pago y muestra el resultado real (hecho, rechazado o fallido).
          router.replace(volviendoHref({ kind, id, origin, debit: param(raw.debit), receive: param(raw.receive), counterpart }));
          return;
        }
        close();
        return;
      }
      router.replace(
        volviendoHref({
          kind,
          id,
          origin,
          debit: param(raw.debit),
          receive: param(raw.receive),
          counterpart,
          ...returnToParams(outcome.ret),
        }),
      );
    } catch {
      router.replace(resultadoHref({ tipo: 'fallo', origin, debit: param(raw.debit), receive: param(raw.receive), counterpart }));
    } finally {
      setBusy(false);
    }
  }

  if (!kind || !id || !redirectUrl) {
    return (
      <Screen title="Va a su billetera" footer={<Button label="Volver" onPress={close} />}>
        <Card tone="danger">
          <AppText variant="body">Algo salió mal al preparar el pago. No salió plata. Vuelva e inténtelo otra vez.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Va a su billetera"
      footer={
        <>
          <Button label="Ir a la billetera" onPress={goToWallet} loading={busy} />
          <Button label="Ahora no" variant="secondary" onPress={close} disabled={busy} />
        </>
      }
    >
      <View style={styles.steps}>
        <PasoAntes n={1} title="Se abre su billetera" caption="Es otra app" />
        <PasoAntes n={2} title="Revise y toque «Aprobar»" caption="Ve cuánto sale y cuánto llega" />
        <PasoAntes n={3} title="Vuelve aquí sola" caption="Si no vuelve, abra Natillera de nuevo" />
      </View>

      {debit || receive ? (
        <Reveal index={4}>
          <Card title="Resumen">
            {debit ? <InfoRow label={kind === 'recurrente' ? 'Tope por cobro' : 'Sale de su billetera'} amount={debit} /> : null}
            {receive ? <InfoRow label={kind === 'p2p' && counterpart ? `${counterpart} recibe` : 'Llega'} amount={receive} tone="money" /> : null}
          </Card>
        </Reveal>
      ) : null}

      {myWallet ? (
        <Reveal index={5}>
          <Card title="Entre con la cuenta de esta billetera" tone="soft">
            <AppText variant="amount" selectable>
              {walletLabel(myWallet)}
            </AppText>
            <AppText variant="body" tone="muted">
              Si la billetera dice «Access to the given resource is forbidden», está abierta con otra cuenta. Salga de esa cuenta y entre con la dueña de esta billetera.
            </AppText>
          </Card>
        </Reveal>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: { gap: space.xl, paddingVertical: space.sm },
});
