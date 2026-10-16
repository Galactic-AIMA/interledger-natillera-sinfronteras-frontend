import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ApiError, useApi, useMyLoans } from '@/api';
import { AppText, Button, Card, InfoRow, Screen } from '@/components';
import { antesHref } from '@/features/pagos/flow';
import { param } from '@/features/pagos/flujo/params';
import { formatAmount } from '@/utils/money';

// 17 · Pago del crédito: la persona da el permiso una vez (grant recurrente 12B) y abre la pasarela (28).
export default function ScreenAutorizarCuotas() {
  const api = useApi();
  const raw = useLocalSearchParams<{ requestId: string }>();
  const requestId = param(raw.requestId);
  const loans = useMyLoans();
  const request = loans.data?.request?.requestId === requestId ? loans.data?.request : null;
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sim = useQuery({
    queryKey: ['loans', 'simulate', request?.amount.value, request?.installments, api.mode],
    queryFn: () => (request ? api.simulateLoan(request.amount, request.installments) : Promise.resolve(null)),
    enabled: request !== null,
  });

  async function authorize() {
    if (!request) return;
    setError(null);
    setStarting(true);
    try {
      const grant = await api.startLoanRepaymentGrant(request.requestId);
      router.push(
        antesHref({
          kind: 'credito',
          id: grant.grantId,
          redirectUrl: grant.redirectUrl,
          demoTitle: 'Cuotas del crédito',
          demoDetail: `La natillera quiere cobrar las cuotas de un crédito.\nTope por cuota: ${formatAmount(grant.limitPerCharge)}\nSe repite: ${grant.repetitions} veces`,
          origin: '/natillera/prestamos',
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos preparar el permiso. Intente otra vez.');
    } finally {
      setStarting(false);
    }
  }

  if (!loans.isLoading && !request) {
    return (
      <Screen title="Pago del crédito" inTabs footer={<Button label="Volver" onPress={() => router.navigate('/natillera/prestamos')} />}>
        <Card tone="danger">
          <AppText>No encontramos esa solicitud de préstamo.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Pago del crédito"
      inTabs
      footer={
        <>
          <Button label="Autorizar las cuotas" onPress={authorize} loading={starting} disabled={!request} accessibilityHint="Abre su billetera para dar el permiso" />
          <Button label="Ahora no" variant="ghost" onPress={() => router.navigate('/natillera/prestamos')} disabled={starting} />
        </>
      }
    >
      {request ? (
        <Card title="Su crédito">
          <InfoRow label="Monto" amount={request.amount} />
          <InfoRow label="Cuotas" value={String(request.installments)} />
          {sim.data ? <InfoRow label="Cuota más alta" amount={sim.data.highestInstallment} /> : null}
        </Card>
      ) : null}
      <AppText tone="muted">Cada cuota tiene dos partes: interés + abono a capital.</AppText>
      <Card tone="soft">
        <AppText>Dé el permiso una vez y las cuotas se cobran solas. Solo se cobra si la tesorera aprueba y usted recibe la plata.</AppText>
      </Card>
      {error ? <AppText tone="danger">{error}</AppText> : null}
    </Screen>
  );
}
