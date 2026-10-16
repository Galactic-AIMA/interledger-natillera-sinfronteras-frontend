import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { openWallet, useApi } from '@/api';
import { AppText, Button, Card, InfoRow, Screen } from '@/components';
import { decodeAmount, isFlowKind, isTrustedWalletUrl, resultadoHref, returnToParams, safeOrigin, startedFlow, volviendoHref, type FlowKind } from '@/features/pagos/flow';
import { PasoAntes } from '@/features/pagos/flujo/PasoAntes';
import { param } from '@/features/pagos/flujo/params';
import { Reveal } from '@/features/pagos/flujo/Reveal';
import { space } from '@/theme';

function asFlowKind(value: string | undefined): FlowKind | undefined {
  return isFlowKind(value) ? value : undefined;
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: { gap: space.xl, paddingVertical: space.sm },
});
