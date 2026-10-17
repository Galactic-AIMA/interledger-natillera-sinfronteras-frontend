import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

import { keys, useApi, waitForFinalPayment, type NatilleraApi, type WalletReturn } from '@/api';
import { ResultScreen } from '@/components';
import { decodeAmount, encodeAmount, isFlowKind, resultadoHref, safeOrigin, settleFlow, startedFlow, type FlowKind, type ResultadoParams } from '@/features/pagos/flow';
import { param } from '@/features/pagos/flujo/params';
import { takeGoalPayment } from '@/features/metas/goalPayments';
import { playSound } from '@/utils/sounds';

type Outcome = Omit<ResultadoParams, 'origin'>;

const WALLET_REJECTIONS = ['grant_rejected', 'rejected'];


async function settle(
  api: NatilleraApi,
  kind: FlowKind,
  id: string,
  ret: WalletReturn,
  fallback: Pick<Outcome, 'debit' | 'receive' | 'counterpart'>,
): Promise<Outcome> {
  const rejectedByWallet = ret.result !== undefined && WALLET_REJECTIONS.includes(ret.result);
  try {
    if (kind === 'recurrente') {
      const grant = await api.finishRecurring(id, { ...ret, grantId: id });
      if (grant.status === 'active' && !rejectedByWallet) {
        return { tipo: 'recurrente-activada', limit: encodeAmount(grant.limitPerCharge), repetitions: String(grant.repetitions) };
      }
      return { tipo: grant.status === 'rejected' || rejectedByWallet ? 'rechazado' : 'fallo' };
    }
    if (kind === 'credito') {
      // 17 → 19: permiso para cobrar las cuotas del préstamo (grant recurrente, flujo 12B).
      const grant = await api.finishLoanRepaymentGrant(id, { ...ret, grantId: id });
      if (grant.status === 'active' && !rejectedByWallet) {
        return { tipo: 'credito-autorizado', limit: encodeAmount(grant.limitPerCharge), repetitions: String(grant.repetitions) };
      }
      return { tipo: grant.status === 'rejected' || rejectedByWallet ? 'rechazado' : 'fallo' };
    }
    try {
      await api.finishPayment(id, { ...ret, paymentId: id });
    } catch (e) {
      // Si la billetera rechazó, no hay nada que confirmar. Si no, el back pudo haber cobrado
      // aunque la respuesta falló: se consulta el estado real antes de dar el pago por fallido.
      if (rejectedByWallet) throw e;
    }
    const payment = await waitForFinalPayment(api, id);
    if (payment.status === 'rejected' || rejectedByWallet) return { tipo: 'rechazado' };
    // pending tras el tiempo de espera: no es fallo, el pago puede seguir en curso
    if (payment.status === 'pending') return { tipo: 'pendiente' };
    if (payment.status !== 'completed') return { tipo: 'fallo' };
    return {
      tipo: kind === 'cuota' ? 'cuota-puesta' : kind === 'desembolso' ? 'prestamo-desembolsado' : 'pago-hecho',
      debit: encodeAmount(payment.debitAmount) ?? fallback.debit,
      receive: encodeAmount(payment.receiveAmount) ?? fallback.receive,
      counterpart: fallback.counterpart ?? payment.counterpartName,
    };
  } catch {
    // Si la persona rechazó en la billetera, igual no salió plata: se le dice que rechazó.
    if (rejectedByWallet) return { tipo: 'rechazado' };
    // Sin respuesta del back no sabemos si cobró: «sigue en proceso» (revisar «Sus pagos»), nunca «No salió plata».
    // Los permisos (recurrente, crédito) no mueven plata al fallar; los pagos sí pueden haber salido.
    return { tipo: kind === 'recurrente' || kind === 'credito' ? 'fallo' : 'pendiente' };
  }
}

// 30 · Volviendo de su billetera
export default function ScreenBilleteraVolviendo() {
  const api = useApi();
  const queryClient = useQueryClient();
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const started = useRef(false);

  // Si la confirmación tarda, se le avisa a la persona para que no crea que la app se congeló.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15_000);
    return () => clearTimeout(timer);
  }, []);

  // Android: el botón atrás no saca a la persona mientras confirmamos (iOS ya lo bloquea en _layout).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Una sola ejecución aunque el efecto corra dos veces (StrictMode) o la pantalla se renderice de nuevo.
    if (started.current) return;
    started.current = true;

    const kind = param(raw.kind);
    const id = param(raw.id);
    const origin = param(raw.origin) ?? '/natillera';
    const ret: WalletReturn = { interactRef: param(raw.interactRef), hash: param(raw.hash), result: param(raw.result) };
    const fallback = { debit: param(raw.debit), receive: param(raw.receive), counterpart: param(raw.counterpart) };

    async function run() {
      // Solo se confirma un flujo que inició esta sesión: un enlace externo no puede disparar el finish.
      const own = isFlowKind(kind) && id && startedFlow(id)?.kind === kind;
      let outcome: Outcome = own ? await settle(api, kind, id, ret, fallback) : { tipo: 'pendiente' };
      // Colecta de Metas: el pago confirmado se suma a la meta (en el front; el back no guarda metas).
      const goalId = own ? takeGoalPayment(id) : undefined;
      const arrived = decodeAmount(outcome.receive);
      if (goalId && outcome.tipo === 'pago-hecho' && arrived) {
        try {
          await api.addGoalContribution(goalId, { amount: arrived, sent: decodeAmount(outcome.debit), paymentId: id });
          outcome = { ...outcome, tipo: 'meta-aporte' };
        } catch {
          // El pago sí salió: se muestra como pago hecho aunque la meta no se haya actualizado.
        }
      }
      if (own) settleFlow(id, outcome);
      // Aviso sonoro: la cuota suena a monedas en el bote; los demás pagos hechos, a «ding-ding».
      if (outcome.tipo === 'cuota-puesta') playSound('monedas');
      else if (outcome.tipo === 'pago-hecho' || outcome.tipo === 'meta-aporte' || outcome.tipo === 'prestamo-desembolsado') playSound('pago');
      // Sin await: el refetch de lo que queda debajo no debe demorar el resultado.
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.natillera }),
        queryClient.invalidateQueries({ queryKey: keys.payments }),
        queryClient.invalidateQueries({ queryKey: ['loans'] }),
        queryClient.invalidateQueries({ queryKey: keys.goals }),
        kind === 'p2p' ? queryClient.invalidateQueries({ queryKey: keys.accounts }) : Promise.resolve(),
      ]);
      router.replace(resultadoHref({ ...outcome, id, origin: safeOrigin(origin) }));
    }
    void run();
  }, [api, queryClient, raw]);

  return (
    <ResultScreen
      kind="loading"
      title="Volviendo de su billetera…"
      message={slow ? 'Está tardando un poco. Un momento, por favor.' : 'Estamos confirmando lo que usted decidió.'}
    />
  );
}
