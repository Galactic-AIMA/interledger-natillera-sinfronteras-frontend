import { StyleSheet, View } from 'react-native';

import { usePayments, type Payment, type PaymentStatus } from '@/api';
import { AppText, Card } from '@/components';
import { palette, space } from '@/theme';
import { formatAmount } from '@/utils/money';

const STALE_PENDING_MS = 10 * 60 * 1000;

const STATUS_LABEL: Record<PaymentStatus, string> = {
  completed: 'completado',
  rejected: 'rechazado',
  pending: 'en proceso',
  failed: 'falló',
};

function PaymentRow({ payment }: { payment: Payment }) {
  const label = `${payment.counterpartName} · ${STATUS_LABEL[payment.status]}`;
  // Solo lo completado descuenta; lo rechazado o fallido no movió plata.
  let value = '$0';
  if (payment.debitAmount) {
    if (payment.status === 'completed') value = `−${formatAmount(payment.debitAmount)}`;
    else if (payment.status === 'pending') value = formatAmount(payment.debitAmount);
  }
  const failed = payment.status === 'rejected' || payment.status === 'failed';
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="amount" tone={failed ? 'muted' : 'default'} align="right">
        {value}
      </AppText>
    </View>
  );
}

/** Sección "Sus pagos": solo los pagos entre personas (kind p2p). */
export function PaymentHistory() {
  const { data, isLoading, isError, refetch } = usePayments();
  // Un 'pending' de más de 10 minutos ya no es "en proceso": quedó abandonado y no se lista.
  const p2p = (data ?? []).filter((p) => {
    if (p.kind !== 'p2p') return false;
    if (p.status !== 'pending') return true;
    const age = Date.now() - new Date(p.createdAt).getTime();
    return Number.isNaN(age) || age <= STALE_PENDING_MS;
  });

  return (
    <Card title="Sus pagos">
      {isLoading ? (
        <AppText tone="muted">Cargando sus pagos…</AppText>
      ) : isError ? (
        <View style={styles.gap}>
          <AppText tone="danger">No pudimos cargar sus pagos.</AppText>
          <AppText tone="accent" accessibilityRole="button" onPress={() => void refetch()} style={styles.retry}>
            Intentar de nuevo
          </AppText>
        </View>
      ) : p2p.length === 0 ? (
        <AppText tone="muted">Todavía no ha enviado pagos. Cuando lo haga, los verá aquí.</AppText>
      ) : (
        p2p.map((payment) => <PaymentRow key={payment.paymentId} payment={payment} />)
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
    paddingVertical: space.xs,
  },
  label: { flexShrink: 1 },
  gap: { gap: space.sm },
  retry: { minHeight: 48, textDecorationLine: 'underline', paddingVertical: space.md },
});
