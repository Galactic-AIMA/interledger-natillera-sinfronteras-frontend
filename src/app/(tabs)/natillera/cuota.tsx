import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ApiError, useApi, useMe, useMyNatillera } from '@/api';
import { AppText, Button, Card, Choice, InfoRow, LinkRow, Screen } from '@/components';
import { antesHref, encodeAmount } from '@/features/pagos/flow';
import { Reveal } from '@/features/pagos/flujo/Reveal';
import { palette, space } from '@/theme';
import { formatAmount } from '@/utils/money';
import { BackButton } from '@/features/navegacion/BackButton';

// 11 · Poner la cuota
export default function ScreenNatilleraCuota() {
  const api = useApi();
  const me = useMe();
  const natilleraQuery = useMyNatillera();
  const natillera = natilleraQuery.data;
  const myId = me.data?.userId;

  const [who, setWho] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mientras no elija, la cuota es a nombre propio.
  const selected = who ?? myId ?? '';
  const onBehalfOfUserId = myId && selected && selected !== myId ? selected : undefined;

  const options = useMemo(() => {
    if (!natillera || !myId) return [];
    const others = natillera.members.filter((m) => m.userId !== myId).map((m) => ({ value: m.userId, label: m.name }));
    return [{ value: myId, label: 'Mía' }, ...others];
  }, [natillera, myId]);

  const quote = useQuery({
    queryKey: ['quote', 'aporte', natillera?.natilleraId, onBehalfOfUserId ?? 'self', api.mode],
    enabled: Boolean(natillera && myId),
    retry: false,
    staleTime: 30_000,
    queryFn: () => {
      if (!natillera) return null;
      return api.previewQuote({ kind: 'aporte', natilleraId: natillera.natilleraId, onBehalfOfUserId, amount: natillera.quota });
    },
  });

  async function pay() {
    if (!natillera || starting) return;
    setStarting(true);
    setError(null);
    try {
      const preview = quote.data ?? undefined;
      const start = await api.startPayment({ kind: 'aporte', natilleraId: natillera.natilleraId, onBehalfOfUserId, amount: natillera.quota });
      const debit = start.debitAmount ?? preview?.debitAmount;
      const receive = start.receiveAmount ?? preview?.receiveAmount ?? natillera.quota;
      const detail = debit
        ? `Sale ${formatAmount(debit)} de su billetera y llegan ${formatAmount(receive)} a ${natillera.natilleraName}.`
        : `Llegan ${formatAmount(receive)} a ${natillera.natilleraName}.`;
      router.push(
        antesHref({
          kind: 'cuota',
          id: start.paymentId,
          redirectUrl: start.redirectUrl,
          demoTitle: 'Poner la cuota',
          demoDetail: detail,
          origin: '/natillera/cuota',
          debit: encodeAmount(debit),
          receive: encodeAmount(receive),
          counterpart: natillera.natilleraName,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos empezar el pago. No salió plata. Intente de nuevo.');
    } finally {
      setStarting(false);
    }
  }

  const loadingData = natilleraQuery.isPending || me.isPending;

  return (
    <Screen headerLeft={<BackButton />}
      title="Poner la cuota"
      inTabs
      footer={
        <>
          {error ? (
            <AppText variant="body" tone="danger" accessibilityRole="alert">
              {error}
            </AppText>
          ) : null}
          <Button label="Poner la cuota" onPress={pay} loading={starting} disabled={!natillera || !myId} />
          <AppText variant="caption" tone="muted" align="center">
            Su billetera le pide permiso antes.
          </AppText>
        </>
      }
    >
      {loadingData ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} accessibilityLabel="Cargando" />
        </View>
      ) : !natillera ? (
        <Card tone="soft">
          <AppText variant="body">Todavía no está en ninguna natillera. Cree una o únase con el código de invitación.</AppText>
        </Card>
      ) : (
        <>
          <Reveal index={0}>
            <Card>
              <AppText variant="label">
                Cuota de {natillera.natilleraName}
              </AppText>
              <AppText variant="amountLarge">{formatAmount(natillera.quota)}</AppText>
            </Card>
          </Reveal>

          <Reveal index={1}>
            <Choice label="¿A nombre de quién?" options={options} value={selected} onChange={setWho} />
          </Reveal>

          <Reveal index={2}>
            <Card title="Resumen">
              {quote.isPending ? (
                <View style={styles.loadingRow} accessibilityLiveRegion="polite">
                  <ActivityIndicator color={palette.primary} />
                  <AppText variant="body" tone="muted">
                    Calculando…
                  </AppText>
                </View>
              ) : quote.data ? (
                <Animated.View
                  key={`${selected}-${quote.data.debitAmount.value}`}
                  entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
                  style={styles.rows}
                >
                  <InfoRow label="Llega a la natillera" amount={quote.data.receiveAmount} tone="money" />
                  <InfoRow label="Sale de su billetera" amount={quote.data.debitAmount} />
                  {quote.data.fee && quote.data.debitAmount.assetCode !== quote.data.receiveAmount.assetCode ? <InfoRow label="Costo del envío" amount={quote.data.fee} tone="muted" /> : null}
                </Animated.View>
              ) : (
                <AppText variant="body" tone="muted">
                  Se calcula al confirmar.
                </AppText>
              )}
            </Card>
          </Reveal>

          <Reveal index={3}>
            <LinkRow label="Que se cobre sola" description="Dé el permiso una vez" onPress={() => router.push('/natillera/recurrente')} />
          </Reveal>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: space.xxl, alignItems: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rows: { gap: space.sm },
});
