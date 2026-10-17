import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ApiError, useApi, useMyLoans } from '@/api';
import { AppText, Button, Card, InfoRow, Screen } from '@/components';
import { antesHref } from '@/features/pagos/flow';
import { param } from '@/features/pagos/flujo/params';
import { formatAmount } from '@/utils/money';
import { BackButton } from '@/features/navegacion/BackButton';

// 17 · Pago del crédito: la persona da el permiso una vez (grant recurrente 12B) y abre la pasarela (28).
export default function ScreenAutorizarCuotas() {
  const api = useApi();
  const raw = useLocalSearchParams<{ requestId: string }>();
  const requestId = param(raw.requestId);
  const loans = useMyLoans();
  const request = loans.data?.request?.requestId === requestId ? loans.data?.request : null;
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El back de préstamos fase 1 no tiene todavía el permiso de cobro (12B): ruta inexistente (403) o 501.
  const [unavailable, setUnavailable] = useState(false);

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
          demoTitle: 'Cuotas del préstamo',
          demoDetail: `La natillera quiere cobrar las cuotas de un préstamo.\nLo máximo por cuota: ${formatAmount(grant.limitPerCharge)}\nSe repite: ${grant.repetitions} veces`,
          origin: '/natillera/prestamos',
        }),
      );
    } catch (e) {
      if (e instanceof ApiError && [403, 404, 405, 501].includes(e.status)) {
        setUnavailable(true);
        return;
      }
      setError(e instanceof ApiError ? e.message : 'No pudimos preparar el permiso. Intente otra vez.');
    } finally {
      setStarting(false);
    }
  }

  if (!loans.isPending && !request) {
    return (
      <Screen headerLeft={<BackButton fallback={'/natillera/prestamos'} />} title="Permiso para cobrar las cuotas" inTabs footer={<Button label="Volver" onPress={() => router.navigate('/natillera/prestamos')} />}>
        <Card tone="danger">
          <AppText>No encontramos esa solicitud de préstamo.</AppText>
        </Card>
      </Screen>
    );
  }

  if (unavailable) {
    return (
      <Screen
        headerLeft={<BackButton fallback={'/natillera/prestamos'} />}
        title="Permiso para cobrar las cuotas"
        inTabs
        footer={<Button label="Volver a Préstamos" onPress={() => router.navigate('/natillera/prestamos')} />}
      >
        <Card title="Su solicitud quedó enviada" tone="soft">
          <AppText>La tesorera ya puede verla.</AppText>
        </Card>
        <Card title="Este paso todavía no está disponible">
          <AppText>
            El permiso para que las cuotas se cobren solas desde su billetera llega pronto. Mientras tanto, la tesorera puede ver su
            solicitud, pero todavía no puede aprobarla ni enviarle la plata.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen headerLeft={<BackButton fallback={'/natillera/prestamos'} />}
      title="Permiso para cobrar las cuotas"
      inTabs
      footer={
        <>
          <Button label="Autorizar las cuotas" onPress={authorize} loading={starting} disabled={!request} accessibilityHint="Abre su billetera para dar el permiso" />
          <Button label="Ahora no" variant="ghost" onPress={() => router.navigate('/natillera/prestamos')} disabled={starting} />
        </>
      }
    >
      {request ? (
        <Card title="Su préstamo">
          <InfoRow label="Monto" amount={request.amount} />
          <InfoRow label="Cuotas" value={String(request.installments)} />
          {sim.data ? <InfoRow label="Cuota más alta" amount={sim.data.highestInstallment} /> : null}
        </Card>
      ) : null}
      <AppText tone="muted">Cada cuota tiene dos partes: lo que abona al préstamo y un pequeño interés.</AppText>
      <Card tone="soft">
        <AppText>Dé el permiso una vez y las cuotas se cobran solas. Solo se cobra si la tesorera aprueba y usted recibe la plata.</AppText>
      </Card>
      {error ? <AppText tone="danger">{error}</AppText> : null}
    </Screen>
  );
}
