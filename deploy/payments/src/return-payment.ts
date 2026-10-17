// GET /payments/{id}/return?interact_ref=…&hash=… — opción B del contrato.
// La billetera redirige aquí (https) después de que la persona aprueba o rechaza. El backend verifica
// el hash, finaliza el pago y responde 302 a la app: `<returnUrl>?paymentId=…&result=ok|rejected|failed|pending`.
// La app no manda nada más: consulta GET /payments/{id}.
//
// Ruta PÚBLICA (sin autorizador: la abre el navegador, sin token) e integración PROXY.
// Seguridad: sin un hash válido no cambia nada. El hash incluye el nonce que solo conoce el backend
// y el nonce del servidor de autorización, así que no se puede fabricar. Un "rechazo" sin hash no
// modifica el pago (queda pending y vence solo): nadie puede anular el pago de otra persona.
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, env, verifyInteractHash, type PaymentRecord } from './shared';
import { completePayment } from './complete';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESULT: Record<string, string> = { completed: 'ok', rejected: 'rejected', failed: 'failed' };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const page = (statusCode: number, title: string, message: string, link?: string) => ({
  statusCode,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(link ? { Location: link } : {}),
  },
  body:
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(title)}</title></head><body style="font-family:system-ui;padding:24px;max-width:480px;margin:auto">` +
    `<h1 style="font-size:20px">${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>` +
    (link ? `<p><a href="${escapeHtml(link)}">Volver a Natillera</a></p>` : '') +
    `</body></html>`,
});

const backToApp = (p: PaymentRecord, result: string) => {
  const target = `${p.appReturnUrl || 'natillera://retorno'}?paymentId=${encodeURIComponent(p.paymentId)}&result=${result}`;
  const titles: Record<string, string> = {
    ok: 'Pago hecho',
    rejected: 'Pago rechazado',
    failed: 'El pago no se pudo hacer',
    pending: 'Pago en proceso',
  };
  return page(302, titles[result] ?? 'Natillera', 'Puede volver a la app.', target);
};

export const handler = async (event: any) => {
  try {
    const paymentId = event?.pathParameters?.id;
    if (typeof paymentId !== 'string' || !UUID.test(paymentId)) {
      return page(400, 'Enlace inválido', 'El enlace de retorno no es válido.');
    }
    const q = event?.queryStringParameters ?? {};
    const { Item } = await dynamo.send(new GetCommand({ TableName: env.paymentsTable, Key: { paymentId } }));
    if (!Item) return page(404, 'Pago no encontrado', 'Este pago no existe.');
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

    const result = await completePayment(payment, interactRef);
    return backToApp(result ?? payment, result ? RESULT[result.status] ?? 'pending' : 'pending');
  } catch (error) {
    console.log('return-payment error', error);
    return page(500, 'Algo falló', 'Intente de nuevo desde la app.');
  }
};
