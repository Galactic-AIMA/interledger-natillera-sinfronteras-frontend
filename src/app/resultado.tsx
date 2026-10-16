import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import type { Amount } from '@/api';
import { AppText, Button, Card, InfoRow, ResultScreen } from '@/components';
import { decodeAmount, safeOrigin, settledOutcome, type ResultKind, type SafeOrigin } from '@/features/pagos/flow';
import { formatAmount } from '@/utils/money';
import { param } from '@/features/pagos/flujo/params';
import { SuccessResult } from '@/features/pagos/flujo/SuccessResult';

type Ctx = {
  origin: SafeOrigin;
  debit?: Amount;
  receive?: Amount;
  counterpart?: string;
  limit?: Amount;
  repetitions?: string;
};

/** "Volver" lleva a la raíz de la pestaña de donde salió el flujo. */
function tabRoot(origin: string): Href {
  return origin.startsWith('/pagar') ? '/pagar' : '/natillera';
}

function done(href: Href) {
  return <Button label="Listo" onPress={() => router.replace(href)} />;
}

/** Monto en la fila de resumen: no se parte en dos renglones ("19,91 US$"); la etiqueta es la que cede. */
function AmountValue({ amount, tone }: { amount: Amount; tone?: 'money' }) {
  return (
    <AppText variant="amount" tone={tone} align="right" numberOfLines={1} style={styles.amount}>
      {formatAmount(amount)}
    </AppText>
  );
}

function retryActions(ctx: Ctx) {
  return (
    <>
      <Button label="Intentar de nuevo" onPress={() => router.replace(ctx.origin)} />
      <Button label="Volver" variant="secondary" onPress={() => router.replace(tabRoot(ctx.origin))} />
    </>
  );
}

// Un caso por variante. Para agregar 'credito-autorizado' (19) y 'prestamo-desembolsado' (23):
// ampliar ResultKind en flow.ts y añadir su entrada aquí (TypeScript avisa si falta).
const VARIANTS: Record<ResultKind, (ctx: Ctx) => ReactElement> = {
  // 34
  'cuota-puesta': (ctx) => (
    <SuccessResult title="Cuota puesta" actions={done('/natillera')}>
      <Card title="Resumen">
        {ctx.receive ? <InfoRow label="Llegó a la natillera" right={<AmountValue amount={ctx.receive} tone="money" />} /> : null}
        {ctx.debit ? <InfoRow label="Salió de su billetera" right={<AmountValue amount={ctx.debit} />} /> : null}
      </Card>
    </SuccessResult>
  ),
  // 31
  'pago-hecho': (ctx) => (
    <SuccessResult title="Pago hecho" actions={done('/pagar')}>
      <Card title="Resumen">
        {ctx.debit ? <InfoRow label="Salió de su billetera" right={<AmountValue amount={ctx.debit} />} /> : null}
        {ctx.receive ? (
          <InfoRow label={`${ctx.counterpart ?? 'La otra persona'} recibió`} right={<AmountValue amount={ctx.receive} tone="money" />} />
        ) : null}
      </Card>
    </SuccessResult>
  ),
  // 32
  rechazado: (ctx) => <ResultScreen kind="rejected" title="Permiso rechazado" message="No salió plata." actions={retryActions(ctx)} />,
  // 33
  fallo: (ctx) => <ResultScreen kind="error" title="Algo falló" message="No salió plata. Puede intentarlo otra vez." actions={retryActions(ctx)} />,
  // 33 (variante): pago sin confirmación final tras el tiempo de espera; no es un fallo ni se debe repetir.
  pendiente: (ctx) => (
    <ResultScreen
      kind="loading"
      title="Su pago sigue en proceso"
      message="Todavía no tenemos la confirmación de su billetera. Revise «Sus pagos» en un momento; no repita el pago."
      actions={done(tabRoot(ctx.origin))}
    />
  ),
  // 19: permiso de las cuotas del crédito; el tope y las repeticiones los pone la pantalla 30.
  'credito-autorizado': (ctx) => (
    <SuccessResult title="Cuotas autorizadas" actions={done('/natillera/prestamos')}>
      <Card title="Resumen">
        {ctx.repetitions ? <InfoRow label="Cuotas" value={ctx.repetitions} /> : null}
        {ctx.limit ? <InfoRow label="Tope por cuota" right={<AmountValue amount={ctx.limit} />} /> : null}
        <AppText variant="body" tone="muted">
          Ahora la tesorera decide si aprueba el préstamo.
        </AppText>
      </Card>
    </SuccessResult>
  ),
  // 23: la tesorera aprobó y el fondo pagó el préstamo.
  'prestamo-desembolsado': (ctx) => (
    <SuccessResult title="Préstamo desembolsado" actions={done('/natillera/prestamos/tesorera')}>
      <Card title="Resumen">
        {ctx.debit ? <InfoRow label="Salió del fondo" right={<AmountValue amount={ctx.debit} />} /> : null}
        {ctx.receive ? (
          <InfoRow label={`${ctx.counterpart ?? 'La persona'} recibió`} right={<AmountValue amount={ctx.receive} tone="money" />} />
        ) : null}
      </Card>
    </SuccessResult>
  ),
  // 14: el tope viene en `limit` y las repeticiones en `repetitions`, puestos por la pantalla 30.
  'recurrente-activada': (ctx) => (
    <SuccessResult title="Cuota automática activada" actions={done('/natillera')}>
      <Card title="Resumen">
        {ctx.limit ? <InfoRow label="Tope por cobro" right={<AmountValue amount={ctx.limit} />} /> : null}
        {ctx.repetitions ? <InfoRow label="Se repite" value={`${ctx.repetitions} veces`} /> : null}
        <AppText variant="body" tone="muted">
          Desde el próximo periodo se cobra sola.
        </AppText>
      </Card>
    </SuccessResult>
  ),
};

const SUCCESS: ReadonlySet<ResultKind> = new Set<ResultKind>(['cuota-puesta', 'pago-hecho', 'recurrente-activada', 'credito-autorizado', 'prestamo-desembolsado']);

function isResultKind(value: string | undefined): value is ResultKind {
  return value !== undefined && Object.hasOwn(VARIANTS, value);
}

// 14 · 31 · 32 · 33 · 34 (y luego 19 · 23): resultado del flujo de pagos
export default function ScreenResultado() {
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const tipo = param(raw.tipo);
  const asked: ResultKind = isResultKind(tipo) ? tipo : 'fallo';
  // Seguridad: un éxito (y sus montos) solo se muestra si la pantalla 30 lo confirmó en esta sesión.
  // Así un enlace natillera://resultado?tipo=pago-hecho no sirve para fingir un pago.
  const settled = settledOutcome(param(raw.id));
  const shown = settled ?? (SUCCESS.has(asked) ? { tipo: 'pendiente' as const } : { tipo: asked });
  const ctx: Ctx = {
    origin: safeOrigin(param(raw.origin)),
    debit: decodeAmount(shown.debit),
    receive: decodeAmount(shown.receive),
    counterpart: shown.counterpart,
    limit: decodeAmount(shown.limit),
    repetitions: shown.repetitions,
  };
  return VARIANTS[shown.tipo](ctx);
}

const styles = StyleSheet.create({
  amount: { flexShrink: 0 },
});
