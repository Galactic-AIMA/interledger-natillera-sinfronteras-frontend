# API de Natillera sin Fronteras — cómo funciona

Documento de entrada al backend: qué piezas hay, cómo se autentica la app, qué hace cada endpoint,
cómo fluye un pago con Open Payments y cómo probarlo. Detalle por tema:

| Documento | Contenido |
|---|---|
| [CURLS.md](CURLS.md) | **Todos los curl** listos para copiar (registro, login, pagos, pruebas negativas) |
| [API-AUTH.md](API-AUTH.md) | Registro y login contra Cognito (requests, errores, ejemplo React Native) |
| [API-PAGOS.md](API-PAGOS.md) | Pagos: despliegue de las Lambdas, plantillas VTL, respuestas de error, curl |
| [API-NATILLERAS.md](API-NATILLERAS.md) | Perfil, billeteras, cuentas guardadas y natilleras (varias por persona) |
| [API-PRESTAMOS.md](API-PRESTAMOS.md) | Préstamos (pedir, autorizar cuotas, desembolso) y cuota automática |
| [COORDINACION.md](COORDINACION.md) | Quién es dueño de qué y cómo desplegar sin pisarse |
| [AWS-SETUP.md](AWS-SETUP.md) | Montaje de la infra en la consola de AWS y estado de cada recurso |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Los 13 flujos y las tablas del diseño (draw.io, página 3) |

Estado al 2026-10-17: todo desplegado en `dev`. Registro, login, pagos 1 a 1 (EUR→COP), vista previa,
natilleras y aportes **probados con la Test Wallet**. Préstamos fase 2 y cuota automática desplegados y en
prueba. Tabla de pagos: `natillera-payments` (antes `payments-history`). Resumen en el [README](../README.md#estado-en-dev-2026-10-17).

## 1 · Piezas

```
 App React Native (Expo)
   │  1. SignUp / InitiateAuth (directo, sin token)
   ├──────────────────────────────► Cognito  ── trigger Pre sign-up ─► Lambda pre-signup
   │                                 (user pool us-east-2_2pQzW95IK)      │ verifica la wallet
   │                                                                       └► DynamoDB user-info
   │  2. Authorization: Bearer <IdToken>
   └──────────────────────────────► API Gateway REST (stage dev, cognito_authorizer, VTL)
                                        │
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
              start-payment       finish-payment       get-payment        (Lambdas Node.js 22)
                     │                  │                  │
                     ├─ Secrets Manager: llave del cliente Open Payments
                     ├─ DynamoDB: user-info, natillera-payments (+ saved-accounts, natillera-*)
                     └─ Open Payments (Test Wallet de Interledger): wallets, grants,
                        incoming payments, quotes, outgoing payments
```

| Recurso | Valor |
|---|---|
| Región / cuenta | `us-east-2` (Ohio) · `349607459198` |
| URL base del API | `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev` |
| User pool / App client | `us-east-2_2pQzW95IK` / `20b10a2tnnr69lqlp2sf62orv0` (público, sin secreto) |
| Secreto Open Payments | `natillera/open-payments-client` (`walletAddressUrl`, `keyId`, `privateKey`) |
| Wallet del cliente (backend) | `https://ilp.interledger-test.dev/f9a1abde` (EUR) |
| Código | `deploy/pre-signup/index.mjs`, `deploy/payments/src/*.ts` (zips en `deploy/payments/dist`) |

## 2 · Autenticación

1. **Registro** (`SignUp` en Cognito): username, password, email, `phone_number` (+57…) y
   `custom:walletId` (wallet de la Test Wallet). La Lambda `pre-signup` verifica que la wallet exista,
   rechaza email/teléfono repetidos, guarda el usuario en `user-info` (con `assetCode`/`assetScale`
   leídos de la wallet) y auto-confirma la cuenta.
2. **Login** (`InitiateAuth`, `USER_PASSWORD_AUTH`): devuelve `IdToken`, `AccessToken` y
   `RefreshToken` (1 h; se renueva con `REFRESH_TOKEN_AUTH`).
3. **Llamadas al API**: `Authorization: Bearer <IdToken>`. El API es REST con autorizador Cognito,
   que valida el **IdToken**. El autorizador rechaza con **401** sin token o con token inválido.
4. **Identidad**: el backend toma el usuario del token (`cognito:username`), **nunca del body**. Con
   ese usuario busca su wallet en `user-info`: quien paga siempre es la persona logueada.

Requests completos: [API-AUTH.md](API-AUTH.md).

## 3 · Endpoints

Todos con `Authorization: Bearer <IdToken>` y `Content-Type: application/json`. Montos siempre como
`{ "value": "<entero en unidades menores>", "assetCode": "EUR", "assetScale": 2 }` (`"1000"` = 10,00).

| Método y ruta | Lambda | Body | Respuesta 200 |
|---|---|---|---|
| `POST /payments` | `start-payment` | `{ kind, walletAddress \| customWalletName \| natilleraId, author?, value, assetCode, assetScale, returnUrl }` | `{ paymentId, redirectUrl, debitAmount, receiveAmount }` |
| `POST /payments/{id}/finish` | `finish-payment` | `{ interact_ref, hash }` | Pago (ver abajo) |
| `GET /payments/{id}` | `get-payment` | — | Pago |
| `GET /payments` | `get-payment` | — | Lista de pagos (recientes primero, máx. 50) |

**Pago:**

```json
{
  "paymentId": "4f6c…",
  "kind": "p2p",
  "status": "pending | completed | rejected | failed",
  "counterpartName": "…",
  "natilleraId": "…",
  "debitAmount": { "value": "1000", "assetCode": "EUR", "assetScale": 2 },
  "receiveAmount": { "value": "450000", "assetCode": "COP", "assetScale": 2 },
  "createdAt": "2026-10-16T21:00:00.000Z",
  "updatedAt": "2026-10-16T21:01:10.000Z"
}
```

**Campos de `POST /payments`:**

| Campo | Regla |
|---|---|
| `kind` | `"p2p"` (a una persona) o `"aporte"` (a la natillera) |
| `walletAddress` | p2p: URL de quien recibe. Solo hosts permitidos (`ilp.interledger-test.dev`). Extensión para pruebas, no está en el contrato del front |
| `customWalletName` | p2p: nombre de una cuenta guardada (`saved-accounts`, flujo 6) |
| `natilleraId` / `author` | aporte: natillera (quien paga debe ser integrante) y socio al que se abona |
| `value` | String de entero positivo, unidades menores |
| `assetCode` / `assetScale` | Los de quien **recibe** → se fija lo que llega; los de quien **paga** → se fija lo que sale. Otros → 400 |
| `returnUrl` | Solo `natillera://retorno` (APK) o `exp://<host>[:puerto]/--/retorno` (Expo Go) |

**Errores**: status HTTP + `{ "error": "<código>", "message": "<detalle>" }`.

| Status | `error` | Cuándo |
|---|---|---|
| 400 | `BadRequest`, `InvalidAmount`, `InvalidReturnUrl`, `InvalidWalletAddress`, `InvalidHash` | Validación del body |
| 401 | `Unauthorized` (o `{"message":"Unauthorized"}` del autorizador) | Sin token, token vencido o sin usuario |
| 403 | `Forbidden` | Aporte a una natillera de la que no es integrante |
| 404 | `UserNotFound`, `PaymentNotFound`, `AccountNotFound`, `NatilleraNotFound` | No existe o es de otra persona |
| 502 | `OpenPaymentsError` | Open Payments rechazó algo (el `message` trae la descripción) |
| 500 | `InternalError` | Error inesperado (ver CloudWatch) |

## 4 · Flujo de un pago (flujos 3 y 4 del diagrama)

> **Desplegado: opción B.** `finish.uri` es `…/payments/{id}/return` del back (no la app): `return-payment`
> verifica el hash, completa el pago y redirige a `natillera://retorno?paymentId=…&result=…`. El diagrama
> de abajo es la opción A (la app llama a `…/finish`), que sigue disponible como respaldo idempotente.

```
App                      API / Lambdas                       Open Payments (Test Wallet)
 │ POST /payments ─────► start-payment
 │                         ├─ GET wallet de quien paga y de quien recibe ─────────►
 │                         ├─ grant + incoming payment en la wallet que recibe ───►
 │                         ├─ grant + quote en la wallet que paga ────────────────►
 │                         ├─ grant INTERACTIVO (outgoing-payment, límite = debitAmount,
 │                         │   finish.uri = returnUrl?paymentId=…, nonce) ─────────►
 │                         └─ guarda en payments-history (status pending)
 │ ◄─ { paymentId, redirectUrl, debitAmount, receiveAmount }
 │
 │ abre redirectUrl ─────────────────────────────────────► la persona inicia sesión y ACEPTA
 │ ◄──────────── returnUrl?paymentId=…&interact_ref=…&hash=… (vuelve a la app)
 │
 │ POST /payments/{id}/finish { interact_ref, hash } ─► finish-payment
 │                         ├─ verifica que el pago sea suyo y esté pending
 │                         ├─ verifica el hash (nonce cliente + nonce AS + interact_ref + URL del grant)
 │                         ├─ pending → processing (atómico: nunca paga dos veces)
 │                         ├─ continúa el grant con interact_ref ─────────────────►
 │                         ├─ crea el outgoing payment con la quote ──────────────►
 │                         └─ status completed | rejected | failed
 │ ◄─ pago
 │ GET /payments/{id} (polling de la pantalla 30) ─► get-payment
```

- Si la persona **rechaza** en la billetera, el grant no continúa → `rejected`.
- Si el outgoing payment falla → `failed`.
- `finish` es **idempotente**: llamarlo de nuevo devuelve el estado sin volver a pagar.
- El front nunca recibe tokens de grants ni nonces; quedan en `payments-history` y el token de
  continuación se borra al usarlo.

## 5 · Cómo está montado en API Gateway (VTL)

Integración **sin proxy** con plantillas de mapeo (decisión de Duvan). Cada método:

- Autorización `cognito_authorizer`; transferencia del cuerpo **Nunca**.
- Plantilla `application/json` que arma `{ "auth": { "username": … }, "paymentId": …, "body": … }`.
- Respuestas de integración que convierten el error `[400] {…}` de la Lambda en el status real.
- Las Lambdas tienen `INTEGRATION_MODE=vtl`.

Plantillas exactas y pasos: [API-PAGOS.md](API-PAGOS.md#plantillas-de-solicitud-de-integración-content-type-applicationjson).

## 6 · Probar

**Script interactivo** (login → iniciar → aprobar → finalizar → consultar). Pide usuario, clave
(oculta), wallet que recibe y monto; no imprime tokens:

```bash
bash scripts/probar-pago.sh
```

Necesita Git Bash (Windows), CloudShell o Linux/macOS, con `curl` y Python 3. Si la ruta de iniciar
todavía es otra: `START_PATH=/start-payment bash scripts/probar-pago.sh`.

Requisitos: un usuario registrado cuya wallet (`custom:walletId`) sea la que **paga**, la sesión de
esa wallet en la Test Wallet (para aceptar) y otra wallet que **reciba** (distinta).

Curl paso a paso: [CURLS.md](CURLS.md).

## 7 · Pendiente

- ✅ Préstamos fase 2 probados con la Test Wallet (2026-10-17). Falta probar la cuota automática con `charge-now` y crear el cobro de cada cuota del préstamo.
- Cobro programado mensual (EventBridge Scheduler) de cuotas y préstamos: después de la hackatón.
- Después de la hackatón: borrar los secretos y llaves de usuario que quedaron de pruebas (`prueba1`, `ciro`)
  y rotar esas llaves en la Test Wallet. El diseño correcto es una sola llave, la del cliente.
