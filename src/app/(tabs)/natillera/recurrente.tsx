import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiError, keys, useApi, useMe, useMyNatillera } from '@/api';
import { AppText, Button, Card, Choice, InfoRow, Screen } from '@/components';
import { antesHref, encodeAmount } from '@/features/pagos/flow';
import { Reveal } from '@/features/pagos/flujo/Reveal';
import { getLastGrantId, setLastGrantId } from '@/features/pagos/recurrente/lastGrant';
import { PasosRecurrente } from '@/features/pagos/recurrente/PasosRecurrente';
import { palette, space } from '@/theme';
import { formatAmount } from '@/utils/money';
import { BackButton } from '@/features/navegacion/BackButton';

// 12 · Cuota automática (pagos recurrentes)
export default function ScreenNatilleraRecurrente() {
  const api = useApi();
  const queryClient = useQueryClient();
  const me = useMe();
  const natilleraQuery = useMyNatillera();
  const natillera = natilleraQuery.data;
  const myId = me.data?.userId;

  const [who, setWho] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charging, setCharging] = useState(false);
  const [chargeMsg, setChargeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // El permiso se guarda fuera de React: al volver de la billetera se relee el último grantId.
  const [lastGrant, setLastGrant] = useState<string | null>(getLastGrantId());
  useFocusEffect(useCallback(() => setLastGrant(getLastGrantId()), []));

  const selected = who ?? myId ?? '';
  const onBehalfOfUserId = myId && selected && selected !== myId ? selected : undefined;

  const options = useMemo(() => {
    if (!natillera || !myId) return [];
    const others = natillera.members.filter((m) => m.userId !== myId).map((m) => ({ value: m.userId, label: m.name }));
    return [{ value: myId, label: 'Mía' }, ...others];
  }, [natillera, myId]);

  const quote = useQuery({
    queryKey: ['quote', 'recurrente', natillera?.natilleraId, onBehalfOfUserId ?? 'self', api.mode],
    enabled: Boolean(natillera && myId),
    retry: false,
    staleTime: 30_000,
    queryFn: () => {
      if (!natillera) return null;
      return api.previewQuote({ kind: 'aporte', natilleraId: natillera.natilleraId, onBehalfOfUserId, amount: natillera.quota });
    },
  });

  async function activate() {
    if (!natillera || starting) return;
    setStarting(true);
    setError(null);
    setChargeMsg(null);
    try {
      const grant = await api.startRecurring({ natilleraId: natillera.natilleraId, onBehalfOfUserId, amount: natillera.quota });
      setLastGrantId(grant.grantId);
      router.push(
        antesHref({
          kind: 'recurrente',
          id: grant.grantId,
          redirectUrl: grant.redirectUrl,
          demoTitle: 'Cuota automática',
          demoDetail: `La natillera quiere cobrar una cuota en cada periodo, con un tope de ${formatAmount(grant.limitPerCharge)} por cobro.`,
          origin: '/natillera/recurrente',
          debit: encodeAmount(grant.limitPerCharge),
          counterpart: natillera.natilleraName,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos activar la cuota automática. No salió plata. Intente de nuevo.');
    } finally {
      setStarting(false);
    }
  }

  async function chargeNow() {
    const grantId = lastGrant;
    if (!grantId || charging) return;
    setCharging(true);
    setChargeMsg(null);
    try {
      await api.chargeRecurringNow(grantId);
      await Promise.all([queryClient.invalidateQueries({ queryKey: keys.natillera }), queryClient.invalidateQueries({ queryKey: keys.payments })]);
      setChargeMsg({ ok: true, text: 'Se cobró la cuota de demostración.' });
    } catch (e) {
      setChargeMsg({ ok: false, text: e instanceof ApiError ? e.message : 'No pudimos hacer el cobro de demostración. Intente de nuevo.' });
    } finally {
      setCharging(false);
    }
  }

  const loadingData = natilleraQuery.isPending || me.isPending;
  const showDemoCharge = api.mode === 'demo' && lastGrant !== null;

  return (
    <Screen headerLeft={<BackButton />}
      title="Cuota automática"
      inTabs
      footer={
        <>
          {error ? (
            <AppText variant="body" tone="danger" accessibilityRole="alert">
              {error}
            </AppText>
          ) : null}
          <Button label="Activar la cuota automática" onPress={activate} loading={starting} disabled={!natillera || !myId} />
          {showDemoCharge ? <Button label="Cobrar ahora (demostración)" variant="secondary" onPress={chargeNow} loading={charging} /> : null}
          {chargeMsg ? (
            <AppText variant="body" tone={chargeMsg.ok ? 'money' : 'danger'} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {chargeMsg.text}
            </AppText>
          ) : null}
          <AppText variant="caption" tone="muted" align="center">
            Dé el permiso una sola vez en su billetera.
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
            <Card title="Cuota automática">
              <View style={styles.rows}>
                <InfoRow label="Se cobra" amount={natillera.quota} />
                <InfoRow label="Cada" value="periodo (por confirmar)" />
                <InfoRow label="Se repite" value="hasta diciembre" />
                {quote.isPending ? (
                  <InfoRow label="Lo máximo por cobro" right={<ActivityIndicator color={palette.primary} accessibilityLabel="Calculando" />} />
                ) : quote.data ? (
                  <InfoRow label="Lo máximo por cobro" amount={quote.data.debitAmount} />
                ) : (
                  <InfoRow label="Lo máximo por cobro" value="Se calcula al confirmar" />
                )}
              </View>
            </Card>
          </Reveal>

          <Reveal index={1}>
            <Choice label="A nombre de" options={options} value={selected} onChange={setWho} />
          </Reveal>

          <Reveal index={2}>
            <Card title="Qué pasa al tocar el botón">
              <PasosRecurrente />
            </Card>
          </Reveal>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: space.xxl, alignItems: 'center' },
  rows: { gap: space.sm },
});
