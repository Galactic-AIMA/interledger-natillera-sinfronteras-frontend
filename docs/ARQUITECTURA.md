# Arquitectura backend — Natillera sin Fronteras (versión final)

Transcripción de la **página 3** del draw.io "Arquitectura Natilleta sin fronteras.drawio"
(Google Drive), hecha el 2026-10-16. Si el diagrama cambia, actualizar este archivo en el mismo PR.

Todas las peticiones (salvo signup y login) llevan `accessToken` de Cognito. Los flujos que
dicen "→ Flujo 3 → Flujo 4" reutilizan el pago en dos fases.

## 0 · Reglas de toda la arquitectura

- **Capa compartida: cliente de Open Payments.** Lee la llave privada del cliente desde
  **Secrets Manager** y habla con la Open Payments API.
- `author` y `paymentAuthor` salen del token de Cognito (claim `sub`); nunca del body.
- `assetCode` y `assetScale` se leen con GET a la dirección de la billetera; el cliente no los
  manda para identificar una cuenta.
- Cada usuario tiene una sola dirección de billetera (`walletAddress`, URL https).
- Todo pago son dos llamadas: iniciar (flujo 3) → la persona aprueba en su billetera →
  finalizar con `interact_ref` (flujo 4).
- Open Payments no crea billeteras: la del fondo se crea a mano en la Test Wallet.
- Los montos viajan como string en unidades menores, con `assetCode` y `assetScale`.

## 1 · Signup

Signup → verificar wallet (`GET walletAddress`, ¿existe?) → crear en Cognito (auto-confirm) →
guardar en `Users-info`.

```js
req = { username: 'customUniqueName', password: '********', email: 'test@test.com',
        phone: '+573125285133', walletAddress: 'https://walletUrl/test' }
// Users-info
userData = { userId: '<sub de Cognito>', username, email, phone, walletAddress,
             assetCode: 'COP', assetScale: 2 }   // asset leído de la wallet
```

## 2 · Login

Usuario y contraseña → Cognito `InitiateAuth` → `accessToken` (va en toda petición).

## 3 · Crear un pago — fase 1: iniciar (`Start payment`)

Body + accessToken → verificar wallets → crear incoming payment → crear quote → grant
interactivo → guardar en `Payments-history` con `status: pending` → devolver `redirectUrl`
(la app abre la billetera).

```js
startPayment = { customWalletName: 'friendlyName', value: '1000', assetCode: 'USD', assetScale: 2 }
// Payments-history
{ paymentId: 'uuid', author: '<sub>', kind: 'p2p | aporte | prestamo', quoteId: quote.id,
  incomingPaymentId: incomingPayment.id, continueUri: grant.continue.uri,
  continueToken: grant.continue.access_token, status: 'pending' }
// Response
{ paymentId: 'uuid', redirectUrl: grant.interact.redirect }
```

## 4 · Finalizar pago — fase 2 (`Accept Payment`)

La app vuelve de la billetera con `interact_ref` → leer pendiente en `Payments-history` por
`paymentId` → continue grant (`interact_ref`) → crear outgoing payment → guardar resultado
(`completed | rejected | failed`).

```js
finishPayment = { paymentId: 'uuid', interact_ref: '<viene en la URL de retorno>' }
createOutgoingPayment({ walletAddress: walletAddress.id, quoteId: quote.id })
// resultado
{ paymentId: 'uuid', status: 'completed', debitAmount: '1000', receiveAmount: '980' }
```

## 5 · Registrar una cuenta con nombre amigable

Verificar wallet (`GET walletAddress`) → guardar en `Saved-accounts`.

```js
RegisterAccount = { walletAddress: 'https://walletUrl/test', customWalletName: 'friendlyName' }
// Saved-accounts
{ author: '<sub>', customWalletName, walletAddress, assetCode: 'USD', assetScale: 2 }
```

## 6 · Pagar a una cuenta registrada

Leer `Saved-accounts` por `customWalletName` → Flujo 3 → Flujo 4.

```js
incomingAmount = { customWalletName: 'friendlyName', value: '1000', assetCode: 'USD', assetScale: 2 }
```

## 7 · Crear natillera

Verificar wallet del fondo (`GET walletAddress`) → guardar en `natillera-registration`.

```js
incomingRequest = { natilleraName: 'name', walletAddress: 'https://walletUrl/fondo' }
// natillera-registration
{ natilleraId: 'id12345', natilleraName, author: '<sub>', integrants: ['<sub del autor>'],
  walletAddress, assetCode: 'COP', assetScale: 2, joinNatilleraUrl: 'url',
  natilleraInvitation: 'unique code' }
// Response
{ natilleraId, natilleraName, joinNatilleraUrl,
  natilleraInvitation: 'QR code | invite URL | unique natillera ID' }
```

## 8 · Aceptar invitación a natillera

```js
joinRequest = { natilleraInvitation: 'unique code' }
// natillera-registration: ADD a integrants
{ natilleraId: 'id12345', integrants: ['person1', 'person2', 'person3', 'PERSON4'] }
```

## 9 · Aportar a la natillera

Verificar que la persona está en la natillera (`natillera-registration`) → Flujo 3 → Flujo 4
(recibe: billetera del fondo) → al quedar `completed`, guardar en `natillera-records`.

```js
savingRequest = { natilleraID, author: '<socio al que se abona>', value: '50000',
                  assetCode: 'COP', assetScale: 2 }
// natillera-records
{ natilleraID, id: 2, author: 'userID', paymentAuthor: '<sub>', amount: '50000',
  payments: ['paymentId1'] }
```

Total del fondo = suma de aportes − préstamos desembolsados (Open Payments no expone saldos).

## 10 · Solicitar préstamo

Guardar en `natillera-loan-request` → buscar ADMIN de la natillera (`natillera-registration` +
`Users-info`) → notificar al admin (extra: SMS o Telegram). El aviso principal es la lista de
pendientes en la app (flujo 13).

```js
loanRequest = { natilleraId: 'id12345', value: '100000', assetCode: 'COP', assetScale: 2, installments: 4 }
// natillera-loan-request
{ requestId: 'uuid', natilleraId, author: '<sub>', amount: '100000', installments: 4,
  status: 'pending', createdAt: '2026-10-16T15:00:00Z' }
```

## 11 · Aprobar o rechazar préstamo y desembolsar (ADMIN)

Guardar decisión en `natillera-loan-request` → si `accepted`: leer billetera de quien pidió en
`Users-info` → Flujo 3 → Flujo 4 (paga: billetera del fondo; aprueba la dueña de la cuenta del
fondo) → al quedar `completed`, guardar en `Natillera-Loans-Records`.

Si `accepted = false` solo cambia el estado de la solicitud; no se llama a Open Payments.

```js
{ requestId: 'uuid', accepted: true }
// Natillera-Loans-Records
{ loanId: 'uuid', requestId, natilleraId, author: 'userID', TEA: 'POR DECIDIR',
  totalAmount: '1000', installments: 4, schedule: [{ n: 1, dueDate: '...', amount: '...' }] }
```

## 12 · Aporte mensual recurrente

Start recurring → grant interactivo con `limits` + `interval` → la persona aprueba en su
billetera → finish recurring (`interact_ref`) → guardar en `Recurring-grants` (token + manage URL)
→ EventBridge Scheduler cada periodo → charge recurring: rotar token, incoming payment, quote,
outgoing payment → guardar en `natillera-records` + `Payments-history`.

Cada cobro usa el token guardado, dentro del tope y del interval; no hay consentimiento por cobro.

```js
recurringRequest = { natilleraID, author: '<socio al que se abona>', value: '50000', assetCode: 'COP', assetScale: 2 }
// grant
{ identifier: customerWalletAddress.id, type: 'outgoing-payment', actions: ['create', 'read'],
  limits: { debitAmount: { assetCode: 'USD', assetScale: 2, value: '1500' },
            interval: 'R12/2025-10-14T00:03:00Z/P1M' } }
// Recurring-grants
{ grantId: 'uuid', payer: '<sub>', natilleraID, author: 'userID', accessToken: 'token',
  manageUrl: 'access_token.manage', interval: 'R12/.../P1M', status: 'active' }
```

## 12B · Pago recurrente del crédito (interés + abono a capital)

Quien pidió el crédito: start loan repayment → grant interactivo con `limits` + `interval`
(R = número de cuotas) → aprueba **antes del desembolso** → finish (`interact_ref`) → guardar en
`Recurring-grants` (`kind: loan`) → EventBridge Scheduler cada periodo → charge loan installment:
leer saldo y plan en `Natillera-Loans-Records` → rotar token, incoming payment (fondo), quote,
outgoing payment (total = interés + capital) → guardar en `Loan-payments` + `Payments-history`
→ `Natillera-Loans-Records.balance -= capital`.

```js
loanRepaymentRequest = { loanId: 'uuid' }
// Plan de ejemplo: $100.000, 4 cuotas, tasa POR DECIDIR
schedule = [
  { n: 1, capital: '25000', interest: '1000', total: '26000', balanceAfter: '75000' },
  { n: 2, capital: '25000', interest: '750',  total: '25750', balanceAfter: '50000' },
  { n: 3, capital: '25000', interest: '500',  total: '25500', balanceAfter: '25000' },
  { n: 4, capital: '25000', interest: '250',  total: '25250', balanceAfter: '0' } ]
// Loan-payments (cada cobro)
{ loanId, n: 1, paymentId, capital: '25000', interest: '1000', total: '26000',
  balanceAfter: '75000', status: 'completed' }
```

- Cada cuota = interés (sobre el saldo pendiente) + abono a capital (monto ÷ cuotas).
- El interés se queda en el fondo; el capital baja el saldo. Saldo 0 → préstamo pagado, se cierra el permiso.
- `limits.debitAmount` debe cubrir la cuota más alta (la primera), con margen si hay otra moneda.
- Si un cobro falla (sin fondos): cuota "en mora", se reintenta y se avisa a la administradora.

## 13 · Consultas del frontend (GET)

| Lectura | Tabla(s) |
|---|---|
| Mi natillera → socios, total del fondo, últimos aportes | `natillera-registration`, `natillera-records` |
| Mis cuentas guardadas | `Saved-accounts` |
| Mi historial | `Payments-history` |
| Solicitudes pendientes (ADMIN) | `natillera-loan-request` |
| Mis préstamos | `Natillera-Loans-Records` |

## Tablas DynamoDB

| Tabla | PK | SK | Notas |
|---|---|---|---|
| `Users-info` | `userId` (sub de Cognito) | — | |
| `Saved-accounts` | `author` | `customWalletName` | |
| `Payments-history` | `paymentId` | — | status: pending \| completed \| rejected \| failed |
| `natillera-registration` | `natilleraId` | — | |
| `natillera-records` | `natilleraID` | `id` | |
| `natillera-loan-request` | `requestId` | — | status: pending \| approved \| rejected |
| `Natillera-Loans-Records` | `loanId` | — | |
| `Recurring-grants` | `grantId` | — | |
| `Loan-payments` | `loanId` | `n` | capital, interest, total, balanceAfter |

Nota: en el diagrama conviven `natilleraId` y `natilleraID`; conviene unificar el nombre
al implementar (pendiente de acordar).

## Decisiones pendientes del equipo

1. Periodo de la cuota recurrente (`P1M` o `P15D`) y número de repeticiones.
2. Tasa del préstamo (TEA): 2,7 %, 2 % mensual o 1 % quincenal.
3. Amortización (12B): capital fijo con cuota decreciente, o cuota fija; manejo de mora.
4. Integración: Lambda proxy o VTL en los flujos que tocan Open Payments.
5. Canal del aviso a la administradora además de la lista en la app (SMS o Telegram).
