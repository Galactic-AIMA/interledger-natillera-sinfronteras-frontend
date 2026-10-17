import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { ApiError, keys, useApi, useMyLoans, useMyNatillera, usePendingLoanRequests, type LoanRequest } from '@/api';
import { AppText, Button, Card, Choice, InfoRow, LinkRow, Screen, StatusPill, TextField } from '@/components';
import { autorizarHref, INSTALLMENT_OPTIONS, planSimHref } from '@/features/creditos/links';
import { toMinorUnits } from '@/utils/money';
import { BackButton } from '@/features/navegacion/BackButton';

// 16 Pedir · 20 Esperando a la tesorera · 25 Rechazado (y acceso a 17, 21 y 24).
export default function ScreenPrestamos() {
  const { data: natillera, isLoading: loadingNatillera } = useMyNatillera();
  const loans = useMyLoans();
  const pending = usePendingLoanRequests();
  const [askingAgain, setAskingAgain] = useState(false);

  const request = loans.data?.request ?? null;
  const loan = loans.data?.loan ?? null;
  const showForm = !request || (request.status === 'rejected' && askingAgain);

  const adminRow =
    natillera?.isAdmin && (pending.data?.length ?? 0) > 0 ? (
      <LinkRow
        label={`Solicitudes por aprobar (${pending.data?.length ?? 0})`}
        description="Usted es la tesorera"
        onPress={() => router.push('/natillera/prestamos/tesorera')}
      />
    ) : null;

  if (loadingNatillera || loans.isLoading) {
    return (
      <Screen headerLeft={<BackButton />} title="Préstamos" inTabs>
        <AppText tone="muted">Cargando…</AppText>
      </Screen>
    );
  }

  if (!natillera) {
    return (
      <Screen headerLeft={<BackButton />} title="Préstamos" inTabs>
        <Card tone="soft">
          <AppText>Para pedir un préstamo primero debe estar en una natillera.</AppText>
        </Card>
      </Screen>
    );
  }

  if (loans.isError) {
    return (
      <Screen headerLeft={<BackButton />} title="Préstamos" inTabs>
        <Card tone="danger">
          <AppText tone="danger">No pudimos cargar sus préstamos.</AppText>
        </Card>
        <Button label="Intentar de nuevo" onPress={() => loans.refetch()} />
      </Screen>
    );
  }

  if (showForm) return <AskLoan natilleraId={natillera.natilleraId} asset={natillera.asset} adminRow={adminRow} />;

  // Con préstamo desembolsado: resumen y plan de pagos (24).
  if (loan) {
    return (
      <Screen headerLeft={<BackButton />} title="Préstamos" inTabs>
        {adminRow}
        <Card title="Su préstamo">
          <InfoRow label="Monto" amount={loan.request.amount} />
          <InfoRow label="Todavía debe" amount={loan.balance} />
        </Card>
        <LinkRow label="Ver el plan de pagos" onPress={() => router.push('/natillera/prestamos/plan')} />
      </Screen>
    );
  }

  return <RequestStatus request={request} adminRow={adminRow} onAskAgain={() => setAskingAgain(true)} />;
}

/** 20 (esperando) y 25 (rechazado); si faltan las cuotas autorizadas, lleva a la 17. */
function RequestStatus({ request, adminRow, onAskAgain }: { request: LoanRequest; adminRow: ReactNode; onAskAgain: () => void }) {
  if (request.status === 'rejected') {
    return (
      <Screen headerLeft={<BackButton />} title="Préstamos" inTabs footer={<Button label="Pedir otro monto" onPress={onAskAgain} />}>
        {adminRow}
        <Card title="Su solicitud">
          <InfoRow label="Monto" amount={request.amount} />
          <InfoRow label="Estado" value="No se aprobó" tone="danger" />
        </Card>
        <AppText tone="muted">No salió plata y el permiso de las cuotas quedó sin efecto.</AppText>
      </Screen>
    );
  }

  const authorized = request.repaymentAuthorized;
  return (
    <Screen headerLeft={<BackButton />}
      title="Préstamos"
      inTabs
      footer={authorized ? undefined : <Button label="Autorizar las cuotas" onPress={() => router.push(autorizarHref(request.requestId))} />}
    >
      {adminRow}
      <Card title="Su solicitud">
        <InfoRow label="Monto" amount={request.amount} />
        <InfoRow label="Cuotas" value={String(request.installments)} />
        <InfoRow label="Cuotas autorizadas" value={authorized ? 'Sí' : 'Todavía no'} tone={authorized ? 'default' : 'danger'} />
        <InfoRow label="Estado" right={<StatusPill label={authorized ? 'Esperando a la tesorera' : 'Falta autorizar las cuotas'} tone="pending" />} />
      </Card>
      {!authorized ? <AppText tone="muted">La tesorera solo puede aprobar cuando usted autorice las cuotas.</AppText> : null}
      <LinkRow label="Ver el plan de pagos" onPress={() => router.push(planSimHref(request.amount, request.installments))} />
    </Screen>
  );
}

// Códigos del back de préstamos (docs/API-PRESTAMOS.md del back) en palabras de la persona.
function loanRequestMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'InsufficientFunds') return 'El fondo todavía no tiene esa plata. Pida un monto menor o espere los próximos aportes.';
    if (e.code === 'LoanAlreadyActive') return 'Ya tiene una solicitud o un préstamo activo en esta natillera.';
    if (e.code === 'InvalidInstallments') return 'Elija entre 1 y 12 cuotas.';
    return e.message;
  }
  return 'No pudimos enviar la solicitud. Intente otra vez.';
}

/** 16 · Pedir un préstamo: monto, cuotas, resumen simulado y solicitud. */
function AskLoan({
  natilleraId,
  asset,
  adminRow,
}: {
  natilleraId: string;
  asset: { assetCode: string; assetScale: number };
  adminRow: ReactNode;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [installments, setInstallments] = useState<number>(4);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = toMinorUnits(text, asset.assetScale, asset.assetCode);
  const amount = value && value !== '0' ? { value, assetCode: asset.assetCode, assetScale: asset.assetScale } : null;

  const sim = useQuery({
    queryKey: ['loans', 'simulate', amount?.value, installments, api.mode],
    queryFn: () => (amount ? api.simulateLoan(amount, installments) : Promise.resolve(null)),
    enabled: amount !== null,
  });

  async function ask() {
    if (!amount) return;
    setError(null);
    setSending(true);
    try {
      const request = await api.requestLoan(natilleraId, amount, installments);
      void queryClient.invalidateQueries({ queryKey: keys.myLoans });
      // Paso siguiente: autorizar el cobro de las cuotas (17).
      router.push(autorizarHref(request.requestId));
    } catch (e) {
      setError(loanRequestMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen headerLeft={<BackButton />} title="Préstamos" inTabs footer={<Button label="Pedir el préstamo" onPress={ask} loading={sending} disabled={!amount} />}>
      {adminRow}
      <TextField label="1. ¿Cuánto necesita?" value={text} onChangeText={setText} keyboardType="decimal-pad" mono error={error} />
      <Choice label="2. ¿En cuántas cuotas?" options={INSTALLMENT_OPTIONS} value={installments} onChange={setInstallments} />
      <Card title="Resumen">
        {sim.data ? (
          <>
            <InfoRow label="Le llegaría" amount={sim.data.receiveAmount} tone="money" />
            <InfoRow label="Lo devuelve en" value={`${installments} cuotas`} />
          </>
        ) : (
          <InfoRow label="Le llegaría" value={amount ? 'Calculando…' : 'Escriba el monto'} tone="muted" />
        )}
      </Card>
      {amount ? <LinkRow label="Ver el plan de pagos" onPress={() => router.push(planSimHref(amount, installments))} /> : null}
    </Screen>
  );
}
