import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { useGoals, useMyNatillera } from '@/api';
import type { Natillera, NatilleraRecord } from '@/api/types';
import { AppText, Button, Card, InfoRow, LinkRow, Screen, StatusPill } from '@/components';
import { GoalCard } from '@/features/metas/GoalCard';
import { palette, radius, space } from '@/theme';
import { formatMovementDate } from '@/utils/dates';
import { formatAmount } from '@/utils/money';

import { JarIllustration } from './JarIllustration';
import { AccountButton } from './AccountButton';

const MONTHS_IN_YEAR = 12;
const MIN_VISIBLE_FILL = 0.1;

// Solo para dibujar: la proporción del frasco. La lógica de plata nunca usa floats.
function jarProgress(natillera: Natillera): { fill: number; monthsReached: number } {
  const perPeriod = Number(natillera.quota.value) * Math.max(natillera.members.length, 1);
  const total = Number(natillera.fundTotal.value);
  if (!(perPeriod > 0) || !(total > 0)) return { fill: 0, monthsReached: 0 };
  const monthsReached = Math.min(MONTHS_IN_YEAR, Math.floor(total / perPeriod));
  const fill = Math.min(1, Math.max(MIN_VISIBLE_FILL, total / (perPeriod * MONTHS_IN_YEAR)));
  return { fill, monthsReached };
}

function RecentRecord({ record }: { record: NatilleraRecord }) {
  const note = record.paidByName !== record.authorName ? `Lo puso ${record.paidByName}` : undefined;
  const when = formatMovementDate(record.createdAt);
  return (
    <View style={styles.record} accessible accessibilityLabel={`${record.authorName}, ${formatAmount(record.amount, { signed: true })}${when ? `, ${when}` : ''}`}>
      <View style={styles.recordText}>
        <AppText variant="bodyStrong">{record.authorName}</AppText>
        {note ? (
          <AppText variant="caption" tone="muted">
            {note}
          </AppText>
        ) : null}
        {when ? (
          <AppText variant="caption" tone="muted">
            {when}
          </AppText>
        ) : null}
      </View>
      <AppText variant="amount" tone="money">
        {formatAmount(record.amount, { signed: true })}
      </AppText>
    </View>
  );
}

// Hasta dos metas en la portada; el resto en la 36.
const HOME_GOALS = 2;

function GoalsSection() {
  const { data: goals } = useGoals();
  const shown = (goals ?? []).slice(0, HOME_GOALS);
  return (
    <Card title="Metas de la familia">
      {shown.length === 0 ? (
        <AppText tone="muted">Un viaje, un regalo o ayudar a alguien: pónganse una meta y llénenla entre todos.</AppText>
      ) : (
        shown.map((goal) => (
          <GoalCard key={goal.goalId} goal={goal} onPress={() => router.push({ pathname: '/natillera/metas/[goalId]', params: { goalId: goal.goalId } })} />
        ))
      )}
      <LinkRow label={shown.length === 0 ? 'Crear una meta' : 'Ver todas las metas'} onPress={() => router.push(shown.length === 0 ? '/natillera/metas/nueva' : '/natillera/metas')} />
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <View accessible accessibilityLabel="Cargando su natillera" style={styles.skeleton}>
      <View style={[styles.block, { height: 260 }]} />
      <View style={[styles.block, { height: 90 }]} />
      <View style={[styles.block, { height: 90 }]} />
    </View>
  );
}

/** 10 · Mi natillera: frasco + camino del año, fondo, ahorro propio, estado y atajos. */
export function HomeNatillera() {
  const reduceMotion = useReducedMotion();
  const { data: natillera, isPending, isError, refetch } = useMyNatillera();

  if (isPending) {
    return (
      <Screen title="Mi natillera" inTabs headerRight={<AccountButton />}>
        <LoadingSkeleton />
      </Screen>
    );
  }

  if (isError || !natillera) {
    return (
      <Screen title="Mi natillera" inTabs headerRight={<AccountButton />}>
        <Card title={isError ? 'No pudimos cargar su natillera' : 'Todavía no tiene natillera'}>
          <AppText tone="muted">{isError ? 'Revise su conexión e inténtelo otra vez.' : 'Cuando se una a una, la verá aquí.'}</AppText>
          {isError ? <Button label="Intentar de nuevo" variant="secondary" onPress={() => void refetch()} /> : null}
        </Card>
      </Screen>
    );
  }

  const { fill, monthsReached } = jarProgress(natillera);
  const upToDate = natillera.myStatus === 'al-dia';
  const enter = reduceMotion ? undefined : FadeInDown.duration(250);
  const fund = formatAmount(natillera.fundTotal);

  return (
    <Screen title="Mi natillera" inTabs headerRight={<AccountButton />} footer={<Button label="Poner la cuota" onPress={() => router.push('/natillera/cuota')} />}>
      <Animated.View entering={enter}>
        <Card tone="soft">
          <AppText variant="label" tone="muted" align="center">
            {natillera.natilleraName}
          </AppText>
          <JarIllustration
            fill={fill}
            monthsReached={monthsReached}
            description={`Frasco de ahorro con ${fund}. ${monthsReached} de ${MONTHS_IN_YEAR} meses del año cubiertos.`}
          />
          <AppText variant="body" align="center">
            Entre todos llevan
          </AppText>
          <AppText variant="amountLarge" tone="money" align="center">
            {fund}
          </AppText>
        </Card>
      </Animated.View>

      <Card title="Fondo">
        <InfoRow label="Suma de aportes" amount={natillera.fundTotal} tone="money" />
      </Card>

      <Card title="Su ahorro">
        <InfoRow label="Lleva" amount={natillera.myTotal} tone="money" />
        <InfoRow label="Estado" right={<StatusPill label={upToDate ? 'Al día' : 'Debe cuota'} tone={upToDate ? 'ok' : 'danger'} />} />
      </Card>

      <GoalsSection />

      <View style={styles.links}>
        <LinkRow label="¿Quién pone?" onPress={() => router.push('/natillera/quien-pone')} />
        <LinkRow label="Préstamos" onPress={() => router.push('/natillera/prestamos')} />
      </View>

      <Card title="Lo último que pasó">
        {natillera.lastRecords.length === 0 ? (
          <AppText tone="muted">Todavía no hay aportes. Cuando alguien ponga su cuota, aparecerá aquí.</AppText>
        ) : (
          natillera.lastRecords.map((record) => <RecentRecord key={record.id} record={record} />)
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: { gap: space.sm },
  record: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 48 },
  recordText: { flex: 1 },
  skeleton: { gap: space.lg },
  block: { backgroundColor: palette.borderSoft, borderRadius: radius.lg },
});
