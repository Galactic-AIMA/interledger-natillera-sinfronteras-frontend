# API — préstamos y cuota automática

> **Desplegado en `dev` el 2026-10-17** (fase 1 y fase 2, deployment `1x7kck`). La fase 2 está más abajo.

Flujos 10, 11 y 13 de [ARQUITECTURA.md](ARQUITECTURA.md), solo la parte que **no** usa Open Payments.
Rama `back/feat-prestamos` (sale de `david`). Código en `deploy/prestamos/src/`, con un handler por endpoint y la lógica en `domain.ts`.
Se despliega con `infra/deploy-prestamos.sh`. Usa el mismo montaje que el bloque A: API REST `lofoyfhz52`, stage `dev`,
`cognito_authorizer` (IdToken), integración **VTL** y errores `[status] {json}` mapeados al status real.

## Endpoints

Todos van con `Authorization: Bearer <IdToken>`. El usuario sale de `cognito:username` del token, nunca del body.

| Método y ruta | Lambda | Entrada | Respuesta 200 |
|---|---|---|---|
| `GET /loans/simulate` | `simulate-loan` | query `value`, `assetCode`, `assetScale`, `installments` | `LoanSimulation` |
| `POST /loans/requests` | `request-loan` | `{ natilleraId, value, assetCode, assetScale, installments }` | `LoanRequest` |
| `GET /loans/requests?status=pending` | `list-loan-requests` | query `natilleraId` opcional | `LoanRequest[]` de las natilleras donde es ADMIN (o solo de la indicada); los demás reciben `[]` |
| `GET /loans/mine` | `get-my-loans` | query `natilleraId` opcional | `{ request, loan }`: el más reciente (de esa natillera, si se indica) |
| `POST /loans/requests/{requestId}/decision` | `decide-loan` | `{ accepted, returnUrl }` | rechazo: `{ status: "rejected" }` |

Las formas son las de `src/api/types.ts` y `docs/openapi.yaml` del front:

```json
// LoanRequest
{ "requestId": "uuid", "natilleraId": "…", "requesterName": "luz",
  "amount": { "value": "2000", "assetCode": "EUR", "assetScale": 2 }, "installments": 4,
  "repaymentAuthorized": false, "status": "pending | approved | rejected", "createdAt": "…" }
// LoanSimulation
{ "amount": {…}, "installments": 3, "receiveAmount": {…}, "highestInstallment": {…},
  "schedule": [{ "n": 1, "capital": {…}, "interest": {…}, "total": {…}, "status": "pendiente" }] }
```

## Reglas

| Tema | Regla |
|---|---|
| Plan de pagos | Las cuotas de capital son iguales y la última absorbe el residuo, así que suman exacto. El interés de cada cuota es el **1 % del saldo** (`LOAN_RATE_BPS=100`, el mismo del modo demo), redondeado. Todo en BigInt |
| Cuotas | De 1 a 12 (`LOAN_MAX_INSTALLMENTS`) |
| Moneda | El préstamo sale del fondo, así que va en su moneda; si viene otra moneda, responde `400 InvalidAmount` |
| Quién pide | Solo integrantes de la natillera (`403 Forbidden`) |
| Monto máximo | Lo disponible en el fondo: aportes de `natillera-records` menos `disbursedTotal` (`409 InsufficientFunds`) |
| Uno a la vez | **Por natillera** (una persona puede estar en varias): si tiene en esa natillera una solicitud pendiente o un préstamo con cuotas por pagar, responde `409 LoanAlreadyActive` |
| Quién decide | La ADMIN (`author` de la natillera). A cualquier otra persona se le responde `404`, para no revelar solicitudes ajenas |
| Rechazar | Escritura condicional `pending → rejected`. Repetir la decisión da `409 AlreadyDecided` |
| Aprobar | Exige `repaymentAuthorized` (`409 RepaymentNotAuthorized`). Con las cuotas autorizadas inicia el **desembolso** (ver fase 2) |
| `receiveAmount` de la simulación | Es el mismo monto: la conversión a la moneda de quien pide sale de la quote del desembolso (fase 2) |

**Errores:** `400 BadRequest | InvalidAmount | InvalidInstallments`, `401 Unauthorized`, `403 Forbidden`,
`404 NatilleraNotFound | LoanRequestNotFound`, `409 LoanAlreadyActive | InsufficientFunds | AlreadyDecided |
RepaymentNotAuthorized`, `500 InternalError` (los de la fase 2, más abajo).

## Tabla

| Tabla | PK | Índices | Quién escribe |
|---|---|---|---|
| `natillera-loan-request` | `requestId` (S) | `author-index` (`author`, `createdAt`) y `natillera-index` (`natilleraId`, `createdAt`), proyección ALL | `request-loan`, `decide-loan`; en la fase 2, el grant y el desembolso |

Solo lee `natillera-registration` y `natillera-records`, sin escribir en ellas.

## Fase 2 y cuota automática (con Open Payments)

Rama `feat/credito-fase2-recurrente` (sale de `david`). Mismo paquete `deploy/prestamos` (carril `credito`):
`op.ts` (cliente, billeteras, returnUrl y hash, copiados de pagos sin tocar sus archivos), `grants.ts`
(grants recurrentes) y `recurring.ts`. Todas con `Authorization: Bearer <IdToken>` e integración VTL.

| Método y ruta | Lambda | Entrada | Respuesta 200 |
|---|---|---|---|
| `POST /loans/requests/{requestId}/repayment-grant` | `start-repayment-grant` | `{ returnUrl }` | `RecurringGrant` con `redirectUrl` |
| `POST /loans/repayment/{grantId}/finish` | `finish-repayment-grant` | `{ interact_ref, hash, result }` | `RecurringGrant` (`active` → la solicitud queda `repaymentAuthorized`) |
| `POST /loans/requests/{requestId}/decision` | `decide-loan` | `{ accepted: true, returnUrl }` | `{ status: "approved", paymentId, redirectUrl, debitAmount, receiveAmount }` (antes: 501) |
| `POST /recurring` | `start-recurring` | `{ natilleraId, author?, value, assetCode, assetScale, returnUrl }` | `RecurringGrant` con `redirectUrl` |
| `POST /recurring/{grantId}/finish` | `finish-recurring` | `{ interact_ref, hash, result }` | `RecurringGrant` |
| `POST /recurring/{grantId}/charge-now` | `charge-recurring-now` | — | `Payment` (`kind: "aporte"`) |

```json
// RecurringGrant (src/api/types.ts del front)
{ "grantId": "uuid", "redirectUrl": "https://…", "limitPerCharge": { "value": "4725000", "assetCode": "COP", "assetScale": 2 },
  "repetitions": 3, "status": "pending | active | rejected" }
```

### Cómo funciona

| Tema | Regla |
|---|---|
| Grant recurrente | `outgoing-payment` con `limits.debitAmount` (tope por cobro) e `interval` `R<n>/<ahora>/P1M`, sobre la billetera de quien paga |
| Tope por cobro | Quote de hoy (llega la cuota exacta al fondo) + **5 %** de margen por la tasa (`GRANT_LIMIT_MARGIN_BPS=500`) |
| Repeticiones | Préstamo: una por cuota. Cuota de la natillera: hasta diciembre, contando el mes actual (`RECURRING_REPETITIONS` la fija) |
| Vuelta de la billetera | `interact.finish.uri` = `<returnUrl>?grantId=<id>`: vuelve directo a la app con `interact_ref` y `hash`, y la app llama a `…/finish` (opción A). Se verifica el hash igual que en pagos |
| Tokens | **Nada de tokens en DynamoDB.** El de continuación y, ya aprobado, el access token y su URL de manejo van en Secrets Manager: `natillera/grants/<grantId>` |
| Cobro (`charge-now`) | Incoming payment en el fondo + quote + outgoing payment con el token guardado; si el token venció (401) se rota una vez. Por encima del tope → `409 LimitExceeded`. Se guarda en `natillera-payments` (historial de quien paga) y en `natillera-records` (aporte, a nombre de `author` si paga por otro) |
| Desembolso | Sale **exacto** el monto del préstamo de la billetera del fondo (quote con `debitAmount`) a la de quien pidió; la tesorera lo aprueba en la billetera del fondo. Se guarda como `PaymentRecord` en `natillera-payments`, así lo completan **return-payment / finish-payment de pagos sin cambios** y la app lo sigue con `GET /payments/{id}` |
| Préstamo activo | Al leer (mis préstamos, pendientes, decidir) se mira el pago del desembolso: `completed` → `approved`, `disbursed`, `receivedAmount`, `disbursedAt` y `disbursedTotal` += monto (una sola vez, escritura condicional); `rejected` / `failed` → se libera para intentarlo de nuevo |

**Errores nuevos:** `400 InvalidReturnUrl | InvalidHash | InvalidWalletAddress`, `404 GrantNotFound`,
`409 AlreadyAuthorized | DisbursementInProgress | GrantNotActive | GrantExhausted | LimitExceeded`,
`502 OpenPaymentsError`. Ya no existe el `501 DisbursementNotAvailable`.

### Tabla nueva

| Tabla | PK | Quién escribe |
|---|---|---|
| `natillera-grants` | `grantId` (S) | `start-*` / `finish-*` / `charge-recurring-now`. Solo datos sin acceso: dueña, natillera, monto, tope, intervalo, billeteras, nonces, estado y cobros hechos |

Escribe además en tablas que ya existen, con la forma de sus dueños: `natillera-payments` (fila de pago),
`natillera-records` (aporte, igual que `complete.ts`) y `disbursedTotal` en `natillera-registration`.

### Pendiente

- Cobro programado de cada cuota del préstamo (`paidCount`): el grant ya queda aprobado; falta la Lambda y
  el EventBridge Scheduler. La app no lo pide para la demo.
- Cobro mensual automático de la cuota: hoy se cobra con `charge-now`; el Scheduler queda para después.

## Desplegar (Ciro)

```bash
cd deploy/prestamos && npm install && npm test && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-prestamos.sh
```

Crea las tablas `natillera-loan-request` (con sus dos índices, uno a la vez) y `natillera-grants`, dos políticas
inline en el rol de `start-payment` (`prestamos-dynamo` y la nueva `cobros-op`: tablas de la fase 2, la llave del
cliente y los secretos `natillera/grants/*`), las 10 Lambdas (cada una con versión de respaldo si ya existía), las
rutas con VTL y el deployment. Sin token, las 10 rutas deben responder `401`. **Avisar en el grupo antes.**

## Probar

```bash
API=https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev
curl -s "$API/loans/simulate?value=10000&assetCode=EUR&assetScale=2&installments=3" -H "Authorization: Bearer $ID_TOKEN"
curl -s -X POST "$API/loans/requests" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' \
  -d '{"natilleraId":"<id>","value":"2000","assetCode":"EUR","assetScale":2,"installments":4}'
curl -s "$API/loans/requests?status=pending" -H "Authorization: Bearer $ID_TOKEN_ADMIN"
curl -s -X POST "$API/loans/requests/<requestId>/decision" -H "Authorization: Bearer $ID_TOKEN_ADMIN" \
  -H 'Content-Type: application/json' -d '{"accepted":false}'
```

Para correr las pruebas en local, sin AWS (DynamoDB, secretos y Open Payments en memoria): `npm test` en `deploy/prestamos` (11 casos).

## En el front

Con esto desplegado, la app ya tiene en `EXPO_PUBLIC_REAL_METHODS` todos los métodos (rama `feat/prestamos-reales`
del front): préstamos completos (`startLoanRepaymentGrant`, `finishLoanRepaymentGrant`, `decideLoan`) y cuota
automática (`startRecurring`, `finishRecurring`, `chargeRecurringNow`). Hasta que se despliegue, esas rutas responden
403 y la app lo explica sin inventar resultados.
