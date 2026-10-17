import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useApi, useMyLoans, type Amount, type Installment } from '@/api';
import { AppText, Card, InfoRow, Screen, StatusPill } from '@/components';
import { param } from '@/features/pagos/flujo/params';
import { space } from '@/theme';
import { formatAmount } from '@/utils/money';
import { BackButton } from '@/features/navegacion/BackButton';

const STATUS: Record<Installment['status'], { label: string; tone: 'ok' | 'pending' | 'danger' }> = {
  pagada: { label: 'Pagada', tone: 'ok' },
  pendiente: { label: 'Pendiente', tone: 'pending' },
  'en-mora': { label: 'Atrasada', tone: 'danger' },
};

/** Monto de la simulación si viene por params (16, 20, 21); si no, se muestra el crédito real. */
function simulationParams(raw: Record<string, string | string[] | undefined>): { amount: Amount; installments: number } | null {
  const value = param(raw.value);
  const assetCode = param(raw.assetCode);
  const scale = Number(param(raw.assetScale));
  const installments = Number(param(raw.installments));
  if (!value || !/^\d+$/.test(value) || !assetCode || !Number.isInteger(scale) || !Number.isInteger(installments) || installments < 1 || installments > 24) return null;
  return { amount: { value, assetCode, assetScale: scale }, installments };
}

// 24 · Su crédito · plan de pagos (real o simulado). Tasa, amortización y periodo los define el back: aquí solo se pintan.
export default function ScreenPlanDePagos() {
  const api = useApi();
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const simParams = simulationParams(raw);
  const loans = useMyLoans();
  const loan = simParams ? null : (loans.data?.loan ?? null);

  const sim = useQuery({
    queryKey: ['loans', 'simulate', simParams?.amount.value, simParams?.installments, api.mode],
    queryFn: () => (simParams ? api.simulateLoan(simParams.amount, simParams.installments) : Promise.resolve(null)),
    enabled: simParams !== null,
  });

  const schedule = loan?.schedule ?? sim.data?.schedule ?? [];
  const requested = loan?.request.amount ?? simParams?.amount;
  const count = loan?.request.installments ?? simParams?.installments;
  const loading = simParams ? sim.isLoading : loans.isPending;

  return (
    <Screen headerLeft={<BackButton fallback={'/natillera/prestamos'} />} title={loan ? 'Su préstamo' : 'Plan de pagos'} inTabs>
      {loading ? <AppText tone="muted">Cargando…</AppText> : null}
      {!loading && !loan && !simParams ? (
        <Card tone="soft">
          <AppText>Todavía no tiene un préstamo entregado.</AppText>
        </Card>
      ) : null}

      {requested ? (
        <Card title="Préstamo">
          <InfoRow label="Monto solicitado" amount={requested} />
          {count ? <InfoRow label="Número de cuotas" value={String(count)} /> : null}
          {loan ? <InfoRow label="Todavía debe" amount={loan.balance} /> : null}
        </Card>
      ) : null}

      {schedule.length > 0 ? (
        <Card title="Plan de pagos">
          {schedule.map((i) => (
            <View
              key={i.n}
              style={styles.row}
              accessible
              accessibilityLabel={`Cuota ${i.n}: ${formatAmount(i.total)}. Abono ${formatAmount(i.capital)} más interés ${formatAmount(i.interest)}. ${STATUS[i.status].label}.`}
            >
              <View style={styles.text}>
                <AppText variant="bodyStrong">{`Cuota ${i.n} · ${formatAmount(i.total)}`}</AppText>
                <AppText variant="caption" tone="muted">{`Abono ${formatAmount(i.capital)} + interés ${formatAmount(i.interest)}`}</AppText>
              </View>
              <StatusPill label={STATUS[i.status].label} tone={STATUS[i.status].tone} />
            </View>
          ))}
        </Card>
      ) : null}

      <AppText variant="caption" tone="muted">
        {loan ? 'Estados: pagada, pendiente o atrasada.' : 'Son valores de ejemplo. El interés final lo confirma la natillera. Estados: pagada, pendiente o atrasada.'}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  text: { flex: 1, gap: 2 },
});
