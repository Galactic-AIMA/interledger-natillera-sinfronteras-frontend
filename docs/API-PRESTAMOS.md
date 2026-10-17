# API — préstamos, fase 1 (sin Open Payments)

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
| Aprobar | Exige `repaymentAuthorized` (`409 RepaymentNotAuthorized`). Con las cuotas autorizadas responde **`501 DisbursementNotAvailable`** hasta que exista la fase 2 |
| `receiveAmount` de la simulación | Es el mismo monto: la conversión a la moneda de quien pide sale de la quote del desembolso (fase 2) |

**Errores:** `400 BadRequest | InvalidAmount | InvalidInstallments`, `401 Unauthorized`, `403 Forbidden`,
`404 NatilleraNotFound | LoanRequestNotFound`, `409 LoanAlreadyActive | InsufficientFunds | AlreadyDecided |
RepaymentNotAuthorized`, `501 DisbursementNotAvailable`, `500 InternalError`.

## Tabla

| Tabla | PK | Índices | Quién escribe |
|---|---|---|---|
| `natillera-loan-request` | `requestId` (S) | `author-index` (`author`, `createdAt`) y `natillera-index` (`natilleraId`, `createdAt`), proyección ALL | `request-loan`, `decide-loan`; en la fase 2, el grant y el desembolso |

Solo lee `natillera-registration` y `natillera-records`, sin escribir en ellas.

## Fase 2 (pendiente, con Open Payments, en coordinación con Duvan)

`GET /loans/mine` ya lee los campos que la fase 2 debe escribir, así que basta con que esa fase los escriba:

| Paso | Ruta | Escribe en `natillera-loan-request` |
|---|---|---|
| Autorizar el cobro de las cuotas (flujo 12B) | `POST /loans/requests/{id}/repayment-grant` + `POST /loans/repayment/{grantId}/finish` | `repaymentAuthorized = true` (+ token del grant) |
| Desembolso al aprobar (flujo 11) | en `decide-loan`, en lugar del 501: pago del fondo a quien pidió → `{ status: "approved", paymentId, redirectUrl, debitAmount, receiveAmount }` | al quedar `completed`: `status = approved`, `disbursed = true`, `receivedAmount`; y `disbursedTotal` += monto en la natillera |
| Cobro de cada cuota | programado | `paidCount` += 1 |

## Desplegar (Ciro)

```bash
cd deploy/prestamos && npm install && npm test && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-prestamos.sh
```

Crea la tabla y sus dos índices (uno a la vez), una política inline `prestamos-dynamo` en el rol de
`start-payment`, las 5 Lambdas (cada una con versión de respaldo si ya existía), las rutas con VTL y el
deployment. Sin token, las 5 rutas deben responder `401`.

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

Para correr las pruebas en local, sin AWS (DynamoDB en memoria): `npm test` en `deploy/prestamos` (6 casos).

## En el front

Con esto desplegado se pueden poner como reales `simulateLoan,requestLoan,getMyLoans,listPendingLoanRequests`.
**`decideLoan` conviene dejarla en demo hasta la fase 2:** la pantalla 21 solo deja aprobar con las cuotas
autorizadas, y eso hoy pasa en el modo demo. Si `requestLoan` es real pero `startLoanRepaymentGrant` no,
la solicitud real nunca queda autorizada. Para el pitch, el camino completo de préstamos sigue en demo.
