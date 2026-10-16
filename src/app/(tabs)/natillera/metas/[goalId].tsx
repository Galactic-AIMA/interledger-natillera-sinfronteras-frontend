import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiError, keys, useApi, useGoal, useMe, useMyNatillera, type Amount, type Goal, type GoalContribution } from '@/api';
import { AppText, Button, Card, InfoRow, Screen, StatusPill, TextField } from '@/components';
import { GoalProgress } from '@/features/metas/GoalCard';
import { registerGoalPayment } from '@/features/metas/goalPayments';
import { daysLeftLabel, deadlineLabel, isReached, remaining, sharePerPerson } from '@/features/metas/goalMath';
import { BackButton } from '@/features/navegacion/BackButton';
import { antesHref, encodeAmount } from '@/features/pagos/flow';
import { param } from '@/features/pagos/flujo/params';
import { palette, space } from '@/theme';
import { currencyName, formatAmount, toMinorUnits } from '@/utils/money';

function ContributionRow({ item }: { item: GoalContribution }) {
  // Si aportó en otra moneda se ve lo que salió de su billetera: ahí está lo "sin fronteras".
  const sentOther = item.sent && item.sent.assetCode !== item.amount.assetCode ? `Envió ${formatAmount(item.sent)}` : undefined;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${item.authorName}, ${formatAmount(item.amount, { signed: true })}${sentOther ? `. ${sentOther}` : ''}`}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong">{item.authorName}</AppText>
        {sentOther ? (
          <AppText variant="caption" tone="muted">
            {sentOther}
          </AppText>
        ) : null}
      </View>
      <AppText variant="amount" tone="money">
        {formatAmount(item.amount, { signed: true })}
      </AppText>
    </View>
  );
}

// 38 · Detalle de la meta: avance, cuánto le toca a cada uno y aportar.
export default function ScreenMeta() {
  const api = useApi();
  const queryClient = useQueryClient();
  const goalId = param(useLocalSearchParams<{ goalId?: string }>().goalId);
  const { data: goal, isLoading, isError, refetch, isFetching } = useGoal(goalId);
  const { data: natillera } = useMyNatillera();
  const { data: me } = useMe();

  const [input, setInput] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Amount | null>(null);

  const minor = goal ? toMinorUnits(input, goal.target.assetScale, goal.target.assetCode) : null;
  const amount: Amount | null = goal && minor ? { value: minor, assetCode: goal.target.assetCode, assetScale: goal.target.assetScale } : null;
  const isColecta = goal?.mode === 'colecta';

  // Colecta: cuánto sale de la billetera de quien aporta (puede ser otra moneda).
  const quote = useQuery({
    queryKey: ['quote', api.mode, 'meta', goal?.beneficiaryWallet, amount?.value],
    queryFn: () =>
      goal?.beneficiaryWallet && amount
        ? api.previewQuote({ kind: 'p2p', walletAddress: goal.beneficiaryWallet, counterpartName: goal.beneficiaryName ?? goal.name, amount })
        : null,
    enabled: Boolean(isColecta && goal?.beneficiaryWallet && amount),
  });

  async function contribute(current: Goal) {
    setTouched(true);
    if (!amount) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      if (current.mode === 'colecta' && current.beneficiaryWallet) {
        const to = current.beneficiaryName ?? current.name;
        const start = await api.startPayment({ kind: 'p2p', walletAddress: current.beneficiaryWallet, counterpartName: to, amount });
        registerGoalPayment(start.paymentId, current.goalId);
        router.push(
          antesHref({
            kind: 'p2p',
            id: start.paymentId,
            redirectUrl: start.redirectUrl,
            demoTitle: 'Aportar a la colecta',
            demoDetail: `Le van a llegar ${formatAmount(amount)} a ${to} para «${current.name}».`,
            origin: '/natillera/metas',
            debit: encodeAmount(start.debitAmount ?? quote.data?.debitAmount),
            receive: encodeAmount(start.receiveAmount ?? quote.data?.receiveAmount ?? amount),
            counterpart: to,
          }),
        );
      } else {
        // Ahorro: se aparta plata del fondo; no pasa por la billetera.
        await api.addGoalContribution(current.goalId, { amount });
        await queryClient.invalidateQueries({ queryKey: keys.goals });
        setSaved(amount);
        setInput('');
        setTouched(false);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos registrar el aporte. Intente de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !goalId) {
    return (
      <Screen headerLeft={<BackButton fallback="/natillera/metas" />} title="Meta" inTabs>
        <View style={styles.center}>
          {goalId ? <ActivityIndicator size="large" color={palette.primary} accessibilityLabel="Cargando la meta" /> : <AppText>No encontramos esa meta.</AppText>}
        </View>
      </Screen>
    );
  }

  if (isError || !goal) {
    return (
      <Screen headerLeft={<BackButton fallback="/natillera/metas" />} title="Meta" inTabs footer={<Button label="Intentar de nuevo" onPress={() => void refetch()} loading={isFetching} />}>
        <Card tone="danger" title="No pudimos cargar la meta">
          <AppText>Revise su conexión e inténtelo otra vez.</AppText>
        </Card>
      </Screen>
    );
  }

  const reached = isReached(goal);
  const members = natillera?.members.length ?? 1;
  const share = sharePerPerson(goal, members);
  const payerOther = isColecta && me && me.assetCode !== goal.target.assetCode;

  const footer = reached ? (
    <Button label="Volver a las metas" variant="secondary" onPress={() => router.replace('/natillera/metas')} />
  ) : (
    <>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button label={isColecta ? `Aportar a ${goal.beneficiaryName ?? 'la colecta'}` : 'Apartar del fondo'} onPress={() => void contribute(goal)} loading={busy} />
    </>
  );

  return (
    <Screen headerLeft={<BackButton fallback="/natillera/metas" />} title={goal.name} inTabs footer={footer}>
      <Card tone="soft">
        <AppText variant="label" tone="muted" align="center">
          {isColecta ? `Colecta para ${goal.beneficiaryName ?? ''}` : 'Ahorro de la natillera'}
        </AppText>
        <AppText variant="amountLarge" tone="money" align="center">
          {formatAmount(goal.raised)}
        </AppText>
        <AppText align="center">de {formatAmount(goal.target)}</AppText>
        <GoalProgress goal={goal} />
        <View style={styles.pill}>
          <StatusPill label={reached ? '¡Meta cumplida!' : `${daysLeftLabel(goal.deadline)} · ${deadlineLabel(goal.deadline)}`} tone={reached ? 'ok' : 'neutral'} />
        </View>
      </Card>

      {reached ? (
        <Card title="¡Lo lograron!">
          <AppText>
            {isColecta
              ? `Entre todos reunieron ${formatAmount(goal.raised)} y le llegaron directo a ${goal.beneficiaryName ?? 'quien los necesitaba'}.`
              : `Ya tienen ${formatAmount(goal.raised)} apartados en el fondo para «${goal.name}».`}
          </AppText>
        </Card>
      ) : (
        <>
          <Card title="¿Cuánto le toca?">
            <InfoRow label="Falta" amount={remaining(goal)} />
            <InfoRow
              label={goal.mode === 'ahorro' && share.periods > 1 ? `Cada uno, por mes (${share.periods} meses)` : `Cada uno (${members} socios)`}
              amount={share.amount}
              tone="money"
            />
          </Card>

          <Card title={isColecta ? 'Aportar' : 'Apartar del fondo'}>
            <TextField
              label={`¿Cuánto ${isColecta ? `le llega a ${goal.beneficiaryName ?? 'quien recibe'}` : 'aparta'}? (${currencyName(goal.target.assetCode)})`}
              value={input}
              onChangeText={(text) => {
                setInput(text);
                setSaved(null);
              }}
              onBlur={() => setTouched(true)}
              keyboardType="numeric"
              placeholder={`$ ${formatAmount(share.amount).replace(/^\$/, '')}`}
              mono
              error={touched && !amount ? 'Escriba un monto mayor a cero.' : null}
            />
            {isColecta && amount ? (
              quote.isLoading ? (
                <AppText tone="muted">Calculando…</AppText>
              ) : quote.data ? (
                <>
                  <InfoRow label="Sale de su billetera" amount={quote.data.debitAmount} />
                  <InfoRow label={`Le llega a ${goal.beneficiaryName ?? 'quien recibe'}`} amount={quote.data.receiveAmount} tone="money" />
                </>
              ) : (
                <AppText tone="muted">{payerOther ? 'Usted paga en su moneda; el cambio se calcula al confirmar.' : 'Se calcula al confirmar.'}</AppText>
              )
            ) : null}
            {saved ? (
              <AppText tone="money" accessibilityLiveRegion="polite">
                Listo: apartó {formatAmount(saved)} para esta meta.
              </AppText>
            ) : null}
          </Card>
        </>
      )}

      <Card title={isColecta ? 'Quiénes han aportado' : 'Lo apartado'}>
        {goal.contributions.length === 0 ? (
          <AppText tone="muted">Todavía no hay aportes. ¡Sea el primero!</AppText>
        ) : (
          goal.contributions.map((item) => <ContributionRow key={item.id} item={item} />)
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', padding: space.xl },
  pill: { alignItems: 'center', marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 48 },
  rowText: { flex: 1 },
});
