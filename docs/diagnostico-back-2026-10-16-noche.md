# Diagnóstico del API del back · 2026-10-16 ~18:25

Revisión de Henry con Claude Code sobre la rama `david` (`c647c45`) y pruebas sin token contra
`https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev`. No se cambió nada en AWS ni en el repo back.

## Qué responde hoy cada ruta (sin token)

| Ruta | Respuesta | Lectura |
|---|---|---|
| `POST /start-payment` · `GET /get-payment` | `401 {"message":"Unauthorized"}` | Bien: el autorizador Cognito corta |
| `POST /payments` · `GET /payments` · `POST /finish-payment` | **`200`** con `{"statusCode":401,"headers":…,"body":"{\"error\":\"Unauthorized\",…}"}` | **El error** (ver abajo) |
| `GET /payments/{id}` · `POST /payments/{id}/finish` · `GET /me` · `GET /natilleras/mine` | `403 Missing Authentication Token` | La ruta no existe en el stage `dev` |

## Diagnóstico

Son tres fallas de configuración en API Gateway; el código de las Lambdas está bien.

1. **Desajuste proxy / sin proxy.** En `/payments` y `/finish-payment` la integración es *sin proxy* (VTL),
   pero la Lambda responde en formato *proxy* (`{statusCode, headers, body}`). Eso pasa cuando la Lambda
   **no tiene `INTEGRATION_MODE=vtl`** (por defecto asume proxy, `shared.ts`) o tiene subido un zip anterior
   a `4d38582`. API Gateway toma ese objeto como un body cualquiera y responde **200**. Para la app, todo
   «sale bien»: no hay `paymentId` ni `redirectUrl`, la billetera no abre y los errores (401, 400, 502)
   nunca llegan con su status.
2. **Sin autorizador en esos métodos.** Sin token la petición llega a la Lambda (por eso el 401 viene
   *dentro* de un 200). No es un hueco explotable porque la Lambda no encuentra usuario y rechaza, pero en
   modo VTL la plantilla lee `$context.authorizer.claims['cognito:username']`, que sin autorizador va vacío:
   **ningún pago funcionaría ni con un token válido.**
3. **Faltan `/payments/{id}` y `/payments/{id}/finish`** (o falta *Deploy API* después de crearlas). La app
   necesita las dos: la 30 consulta el pago y la vuelta de la billetera lo finaliza.

## Solución recomendada: pasar a integración proxy

Es la más viable para esta noche: quita las plantillas VTL y las respuestas de integración (justo donde
está el error), y el código ya la soporta (`currentUsername` lee `cognito:username` de
`requestContext.authorizer.claims` en REST proxy, desde `b9b0cb0`).

1. **Lambdas** `start-payment`, `finish-payment`, `get-payment`: subir los zips de `deploy/payments/dist`
   de `c647c45` y **borrar** la variable `INTEGRATION_MODE` (o ponerla en `proxy`).
2. **Recursos** en el API REST `lofoyfhz52`:
   - `/payments` → `POST` (start-payment) y `GET` (get-payment)
   - `/payments/{id}` → `GET` (get-payment)
   - `/payments/{id}/finish` → `POST` (finish-payment)
   En la consola: seleccionar `/payments` → *Crear recurso* → nombre `{id}` (con las llaves, «ruta de
   recurso» `/payments/`); luego, sobre `{id}`, *Crear recurso* `finish`.
3. **Cada método:** tipo de integración *Función Lambda* con **«Integración de proxy de Lambda» activada**,
   y en *Solicitud de método* → Autorización **`cognito_authorizer`**.
4. **Implementar API → stage `dev`.** Sin esto no cambia nada.
5. Borrar o dejar quietos `/start-payment`, `/get-payment`, `/finish-payment` (la app no los usa).

**Comprobación** (sin token, todas deben dar `401 {"message":"Unauthorized"}`):

```bash
API=https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev
```

```bash
for r in "POST /payments" "GET /payments" "GET /payments/x" "POST /payments/x/finish"; do set -- $r; echo "$r $(curl -s -o /dev/null -w '%{http_code}' -X $1 $API$2)"; done
```

Luego, con un IdToken: `bash scripts/probar-pago.sh` del repo back (ya usa `/payments`).

## Alternativa: mantener VTL (decisión de Duvan)

Más pasos y más fácil de equivocar, pero funciona: `INTEGRATION_MODE=vtl` en las 3 Lambdas,
`cognito_authorizer` en cada método, plantilla de `docs/API-PAGOS.md` en cada uno (con `paymentId` desde
`$input.params('id')` en las rutas con `{id}`), *Transferencia del cuerpo = Nunca*, las respuestas de
integración `^\[400\].*`, `^\[401\].*`, `^\[403\].*`, `^\[404\].*`, `^\[502\].*`, `^\[500\].*` en cada
método, crear las dos rutas con `{id}` e *Implementar API*.

## Revisión del código de pagos (`deploy/payments/src`, `c647c45`)

**Tamaño:** unas 580 líneas en las 3 Lambdas más `shared.ts` (36 de ellas son `get-payment`), con
comentarios. Es normal: un pago con Open Payments son 3 grants, un incoming payment, una quote, la
continuación y el outgoing payment, más validaciones. Unas 40 líneas existen solo para soportar los dos
modos (proxy y VTL); si se queda en proxy, sobran, pero no estorban. `tsc --noEmit` limpio.

**Coherencia con el flujo de Open Payments: correcta.** `start-payment` hace incoming payment en la wallet
de quien recibe → quote en la de quien paga → grant interactivo con `limits.debitAmount` de la quote y
`finish` con nonce → guarda en `payments-history`. `finish-payment` verifica que el pago sea de quien llama,
verifica el hash, pasa a `processing` de forma atómica (no paga dos veces), continúa el grant y crea el
outgoing payment con la quote. Cuadra con el contrato del front (`POST /payments`, `/payments/{id}/finish`,
`GET /payments/{id}`, montos como string, `returnUrl` en lista blanca).

Detalles que no bloquean la demo, por si sobra tiempo:

1. **Hash con `+`:** el hash es base64. Si la billetera devuelve `+` sin codificar, `Linking.parse` del front
   lo convierte en espacio y el back responde `400 InvalidHash`. Arreglo de una línea en
   `verifyInteractHash`: comparar con `hash.replace(/ /g, '+')`.
2. **Rechazo en la billetera:** la app muestra «rechazado» bien, pero el back nunca se entera (sin
   `interact_ref` la app solo hace `GET`) y el pago queda `pending` en el historial.
3. **`completed` es optimista:** se marca al *crear* el outgoing payment; el dinero puede seguir en camino.
   Para la demo basta; lo estricto sería consultar el outgoing payment hasta `sentAmount = debitAmount`.
4. **La quote vence** (en la Test Wallet, minutos): si la persona tarda en aceptar, el pago sale `failed`.
   En la demo, aceptar rápido.
5. Si `grant.continue` falla por algo distinto de Open Payments (red), el pago queda en `processing`.

## Después del pago (no bloquea el arreglo)

- `GET /me` y `GET /natilleras/mine` no existen: en modo real la pantalla 10 falla. Para la demo, el modo
  híbrido del front ya cubre esto: `EXPO_PUBLIC_REAL_METHODS=startPayment,finishPayment,getPayment` deja
  perfil y natillera en datos de ejemplo y solo el pago va al back.
- Para pagar por `customWalletName` hay que cargar a mano la cuenta en `saved-accounts`.
- `.env` de Camilo: `EXPO_PUBLIC_API_URL=<URL de arriba>` y `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id`.
