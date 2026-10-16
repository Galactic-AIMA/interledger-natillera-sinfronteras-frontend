import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { ApiError, keys, useApi, useMyNatillera, usePendingLoanRequests, type LoanRequest } from '@/api';
import { AppText, Button, Card, InfoRow, LinkRow, Screen } from '@/components';
import { planSimHref } from '@/features/creditos/links';
import { antesHref } from '@/features/pagos/flow';
import { formatAmount } from '@/utils/money';

// 21 · Préstamos (tesorera): aprueba o rechaza. Aprobar abre la billetera del fondo para el desembolso (22 → 30 → 23).
export default function ScreenTesorera() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { data: natillera } = useMyNatillera();
  const pending = usePendingLoanRequests();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(request: LoanRequest, accepted: boolean) {
    setError(null);
    setBusy(`${request.requestId}:${accepted ? 'ok' : 'no'}`);
    try {
      const result = await api.decideLoan(request.requestId, accepted);
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
      if (result.status === 'approved') {
        router.push(
          antesHref({
            kind: 'desembolso',
            id: result.paymentId,
            redirectUrl: result.redirectUrl,
            demoTitle: 'Billetera del fondo',
            demoDetail: [
              'La natillera quiere desembolsar un préstamo.',
              `Recibe: ${request.requesterName}`,
              result.debitAmount ? `Sale: ${formatAmount(result.debitAmount)}` : null,
              result.receiveAmount ? `Llega: ${formatAmount(result.receiveAmount)}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
            origin: '/natillera/prestamos/tesorera',
          }),
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos registrar la decisión. Intente otra vez.');
    } finally {
      setBusy(null);
    }
  }

  if (natillera && !natillera.isAdmin) {
    return (
      <Screen title="Préstamos" inTabs>
        <Card tone="soft">
          <AppText>Solo la tesorera aprueba los préstamos.</AppText>
        </Card>
      </Screen>
    );
  }

  const list = pending.data ?? [];
  return (
    <Screen title="Préstamos" inTabs>
      {pending.isLoading ? <AppText tone="muted">Cargando…</AppText> : null}
      {pending.isError ? <AppText tone="danger">No pudimos cargar las solicitudes.</AppText> : null}
      {!pending.isLoading && list.length === 0 ? (
        <Card tone="soft">
          <AppText>No hay solicitudes de préstamo por aprobar.</AppText>
        </Card>
      ) : null}
      {error ? <AppText tone="danger">{error}</AppText> : null}

      {list.map((request) => (
        <Card key={request.requestId} title={`${request.requesterName} pidió un préstamo`}>
          <InfoRow label="Monto" amount={request.amount} />
          <InfoRow label="Cuotas" value={String(request.installments)} />
          <InfoRow label="Cuotas autorizadas" value={request.repaymentAuthorized ? 'Sí' : 'Todavía no'} tone={request.repaymentAuthorized ? 'default' : 'danger'} />
          {natillera ? <InfoRow label="La natillera tiene" amount={natillera.fundTotal} tone="money" /> : null}
          <LinkRow label="Ver el plan de pagos" onPress={() => router.push(planSimHref(request.amount, request.installments))} />
          <Button
            label="Aprobar"
            onPress={() => decide(request, true)}
            loading={busy === `${request.requestId}:ok`}
            disabled={busy !== null || !request.repaymentAuthorized}
            accessibilityHint="Abre la billetera del fondo"
          />
          <Button label="Rechazar" variant="danger" onPress={() => decide(request, false)} loading={busy === `${request.requestId}:no`} disabled={busy !== null} />
          <AppText variant="caption" tone="muted">
            {request.repaymentAuthorized ? 'Al aprobar se abre la billetera del fondo.' : 'Se puede aprobar cuando la persona autorice las cuotas.'}
          </AppText>
        </Card>
      ))}
    </Screen>
  );
}
