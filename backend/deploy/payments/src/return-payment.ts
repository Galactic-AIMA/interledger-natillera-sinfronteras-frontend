// GET /payments/{id}/return?interact_ref=…&hash=… — opción B del contrato.
// La billetera redirige aquí (https) después de que la persona aprueba o rechaza. El backend verifica
// el hash, finaliza el pago y responde 302 a la app: `<returnUrl>?paymentId=…&result=ok|rejected|failed|pending`.
// La app no manda nada más: consulta GET /payments/{id}.
//
// Ruta PÚBLICA (sin autorizador: la abre el navegador, sin token) e integración PROXY.
// Seguridad: sin un hash válido no cambia nada. El hash incluye el nonce que solo conoce el backend
// y el nonce del servidor de autorización, así que no se puede fabricar. Un "rechazo" sin hash no
// modifica el pago (queda pending y vence solo): nadie puede anular el pago de otra persona.
//
// Rapidez: con el hash verificado responde de una (result=pending) y completa el pago en segundo plano,
// invocándose a sí misma de forma asíncrona. La app consulta GET /payments/{id} hasta el estado final.
// Si la invocación asíncrona falla, se completa aquí mismo como antes.
//
// Vuelta a la app con una página, no con un 302 (2026-10-17): Chrome en Android solo abre un esquema
// propio (natillera://, exp://) si hubo un toque reciente. Si la Test Wallet tarda en aceptar, el 302
// queda bloqueado sin aviso, la pestaña sigue mostrando "Accept" y el segundo toque da "Internal Server
// Error" (con el pago ya hecho). La página reemplaza la de la billetera (ya no hay Accept que tocar dos
// veces), intenta abrir la app sola y deja el botón "Volver a la app", que siempre cuenta como toque.
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, env, validateReturnUrl, verifyInteractHash, type PaymentRecord } from './shared';
import { completePayment } from './complete';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESULT: Record<string, string> = { completed: 'ok', rejected: 'rejected', failed: 'failed' };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const page = (statusCode: number, title: string, message: string) => ({
  statusCode,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  body:
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(title)}</title></head><body style="font-family:system-ui;padding:24px;max-width:480px;margin:auto">` +
    `<h1 style="font-size:20px">${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`,
});

const backToApp = (p: PaymentRecord, result: string) => {
  // Se vuelve a validar la URL guardada (lista cerrada); si no pasa, se usa la del APK.
  let base = 'natillera://retorno';
  try {
    base = validateReturnUrl(p.appReturnUrl);
  } catch {}
  const target = `${base}?paymentId=${encodeURIComponent(p.paymentId)}&result=${result}`;
  const titles: Record<string, string> = {
    ok: 'Pago hecho',
    rejected: 'Pago rechazado',
    failed: 'El pago no se pudo hacer',
    pending: 'Su pago va en camino',
  };
  return returnPage(titles[result] ?? 'Natillera', target);
};

// 200 con la página de vuelta. JSON.stringify deja la URL como literal de JS seguro; "<" se escapa para que
// no pueda cerrar el <script>.
const returnPage = (title: string, target: string) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  body:
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(title)}</title></head>` +
    `<body style="font-family:system-ui;padding:32px 24px;max-width:480px;margin:auto;text-align:center;background:#FBF7F0;color:#1F1A17">` +
    `<h1 style="font-size:24px;margin:24px 0 8px">${escapeHtml(title)}</h1>` +
    `<p style="font-size:18px;margin:0 0 32px">Ya puede volver a Natillera. No toque nada más en la billetera.</p>` +
    `<a href="${escapeHtml(target)}" style="display:block;padding:18px;border-radius:14px;background:#1F4E3D;color:#fff;` +
    `font-size:20px;font-weight:700;text-decoration:none">Volver a la app</a>` +
    `<script>setTimeout(function(){location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')})},150)</script>` +
    `</body></html>`,
});

// Grants recurrentes (cuotas del préstamo y cuota automática, backend/deploy/prestamos): la billetera también
// vuelve aquí con el id del grant. Se muestra la página «Volver a la app» (Chrome en Android bloquea
// natillera:// sin un toque reciente) y, como la app no siempre procesa el enlace al volver por el botón, el
// back termina el grant por su cuenta: invoca de forma asíncrona la Lambda `finish-*` de préstamos con la
// dueña del grant; allí se verifica el hash y se continúa el grant (idempotente si la app también llama).
const lambda = new LambdaClient({ region: process.env.AWS_REGION });
const GRANTS_TABLE = process.env.GRANTS_TABLE || 'natillera-grants';
const REF = /^[A-Za-z0-9._~+\/=-]{1,512}$/;

const grantReturn = async (grantId: string, q: Record<string, string | undefined>) => {
  const { Item } = await dynamo.send(new GetCommand({ TableName: GRANTS_TABLE, Key: { grantId } }));
  if (!Item) return page(404, 'Enlace no encontrado', 'Este enlace de retorno no existe.');
  let base = 'natillera://retorno';
  try {
    base = validateReturnUrl(Item.appReturnUrl);
  } catch {}
  const params = new URLSearchParams({ grantId });
  const approved = typeof q.interact_ref === 'string' && REF.test(q.interact_ref) && typeof q.hash === 'string' && REF.test(q.hash);
  if (approved) {
    params.set('interact_ref', q.interact_ref!);
    params.set('hash', q.hash!);
    const fn = Item.kind === 'recurring' ? 'finish-recurring' : 'finish-repayment-grant';
    try {
      const payload = { auth: { username: Item.author }, params: { grantId }, body: { interact_ref: q.interact_ref, hash: q.hash } };
      await lambda.send(new InvokeCommand({ FunctionName: fn, InvocationType: 'Event', Payload: Buffer.from(JSON.stringify(payload)) }));
      console.log('grant finish invoked', fn, grantId);
    } catch (error) {
      console.log('grant finish invoke failed (la app aún puede llamar a …/finish)', fn, grantId, error);
    }
  } else {
    params.set('result', 'grant_rejected');
  }
  return returnPage(approved ? 'Permiso aprobado' : 'Permiso rechazado', `${base}?${params.toString()}`);
};

const SELF = process.env.AWS_LAMBDA_FUNCTION_NAME;

// Evento interno (solo por lambda:Invoke, nunca desde API Gateway): completa el pago en segundo plano.
type AsyncComplete = { asyncComplete: { paymentId: string; interactRef: string; hash: string } };

const completeInBackground = async ({ paymentId, interactRef, hash }: AsyncComplete['asyncComplete']) => {
  const { Item } = await dynamo.send(new GetCommand({ TableName: env.paymentsTable, Key: { paymentId } }));
  const payment = Item as PaymentRecord | undefined;
  if (!payment || payment.status !== 'pending') return;
  if (!verifyInteractHash(payment, interactRef, hash)) return;
  const result = await completePayment(payment, interactRef);
  console.log('async complete', paymentId, result?.status ?? 'already processing');
};

export const handler = async (event: any) => {
  if (event?.asyncComplete) return completeInBackground((event as AsyncComplete).asyncComplete);
  try {
    const paymentId = event?.pathParameters?.id;
    if (typeof paymentId !== 'string' || !UUID.test(paymentId)) {
      return page(400, 'Enlace inválido', 'El enlace de retorno no es válido.');
    }
    const q = event?.queryStringParameters ?? {};
    const { Item } = await dynamo.send(new GetCommand({ TableName: env.paymentsTable, Key: { paymentId } }));
    if (!Item) return grantReturn(paymentId, q);
    const payment = Item as PaymentRecord;

    if (payment.status !== 'pending') {
      return backToApp(payment, RESULT[payment.status] ?? 'pending');
    }

    const interactRef = typeof q.interact_ref === 'string' ? q.interact_ref : '';
    const hash = typeof q.hash === 'string' ? q.hash : '';
    if (!interactRef || !hash) {
      // Rechazo en la billetera (result=grant_rejected) o retorno incompleto: sin hash no se toca el pago.
      return backToApp(payment, 'rejected');
    }
    if (!verifyInteractHash(payment, interactRef, hash)) {
      console.log('return with invalid hash', paymentId);
      return page(400, 'Enlace inválido', 'No pudimos verificar la aprobación de la billetera.');
    }

    if (SELF) {
      try {
        const payload: AsyncComplete = { asyncComplete: { paymentId, interactRef, hash } };
        await lambda.send(
          new InvokeCommand({ FunctionName: SELF, InvocationType: 'Event', Payload: Buffer.from(JSON.stringify(payload)) }),
        );
        return backToApp(payment, 'pending');
      } catch (error) {
        console.log('async invoke failed, completing inline', error);
      }
    }

    const result = await completePayment(payment, interactRef);
    return backToApp(result ?? payment, result ? RESULT[result.status] ?? 'pending' : 'pending');
  } catch (error) {
    console.log('return-payment error', error);
    return page(500, 'Algo falló', 'Intente de nuevo desde la app.');
  }
};
