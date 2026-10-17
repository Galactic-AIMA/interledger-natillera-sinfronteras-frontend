# Natillera sin Fronteras — backend

> **EN:** Serverless backend (AWS Lambda + API Gateway + Cognito + DynamoDB) for a cross-border family
> savings circle. Every payment goes through **Open Payments**: incoming payment on the receiver's wallet,
> quote on the sender's, and an interactive grant the person approves in their own wallet. Only the backend
> holds the client key. Built for the Interledger Open Payments Hackathon (Medellín, Oct 16–17, 2026).
> Mobile app: the root of this same repo ([interledger-natillera-sin-fronteras](https://github.com/Galactic-AIMA/interledger-natillera-sin-fronteras)).

Una **natillera** es un fondo de ahorro en familia. Este backend permite que cada integrante ponga su cuota desde
su propia billetera, en su moneda, a la billetera común del fondo. También permite pagarle a otra persona y llevar
las cuentas de la natillera (quién puso, cuánto hay, quién debe).

## Arquitectura

```
App (Expo) ──IdToken──▶ API Gateway REST (stage dev, autorizador Cognito)
                              │
                              ├─ Lambdas de pagos ── SDK @interledger/open-payments ──▶ Test Wallet (Rafiki)
                              │        └─ llave del cliente: Secrets Manager (natillera/open-payments-client)
                              ├─ Lambdas de préstamos y cuota automática ── Open Payments (grants recurrentes)
                              │        └─ token de cada grant aprobado: Secrets Manager (natillera/grants/<id>)
                              ├─ Lambdas de natilleras, cuentas y perfil (solo DynamoDB)
                              └─ DynamoDB: user-info, natillera-payments, natillera-registration,
                                           natillera-records, saved-accounts, natillera-loan-request,
                                           natillera-grants
Cognito (us-east-2) ── pre-signup: verifica la billetera y guarda el perfil
```

- **Región:** `us-east-2`.
- **API:** `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev`.
- **Autorización:** Cognito con IdToken. La identidad sale siempre del token (`cognito:username`), nunca del body.
- **Despliegue:** sin IaC. Se hace con scripts de AWS CLI idempotentes en [`infra/`](infra/), que publican una versión de respaldo de cada Lambda antes de reemplazarla.

## El pago con Open Payments (flujos 3 y 4)

1. `POST /payments` (`start-payment`) hace tres cosas:
   - crea un **incoming payment** en la billetera de quien recibe (el fondo o una persona);
   - crea una **quote** en la billetera de quien paga;
   - pide un **grant interactivo** de outgoing payment, con `limits.debitAmount` de la quote y `finish` con nonce.

   Devuelve `{ paymentId, redirectUrl, debitAmount, receiveAmount }`.
2. La persona aprueba en su billetera.
3. La billetera vuelve a `GET /payments/{id}/return` (`return-payment`, ruta pública). Esa Lambda:
   - **verifica el hash** de la interacción;
   - pasa el pago a `processing` de forma atómica, para no pagar dos veces;
   - hace `grant.continue` y crea el **outgoing payment** con la quote;
   - responde **de una** con una página «Su pago va en camino» que abre la app (`natillera://retorno?paymentId=…&result=…`) y tiene el botón «Volver a la app», siempre que el `returnUrl` esté en una lista cerrada. El pago se completa en segundo plano (auto-invocación asíncrona) y la app consulta `GET /payments/{id}`. Con un 302, Chrome en Android a veces no abría la app y un segundo toque a «Accept» daba «Internal Server Error» en la Test Wallet.
4. `GET /payments/{id}` da el estado final. `POST /payments/{id}/finish` queda como respaldo idempotente.

Si es un **aporte** a la natillera, al quedar `completed` se registra en `natillera-records` y suma al fondo.
Detalle en [docs/API-PAGOS.md](docs/API-PAGOS.md).

## Rutas

| Bloque | Rutas | Código | Doc |
|---|---|---|---|
| Registro y login | Cognito `SignUp` / `InitiateAuth` + trigger `pre-signup` | `deploy/pre-signup` | [API-AUTH](docs/API-AUTH.md) |
| Pagos | `POST /payments`, `POST /payments/preview`, `GET /payments`, `GET /payments/{id}`, `POST /payments/{id}/finish`, `GET /payments/{id}/return` | `deploy/payments` | [API-PAGOS](docs/API-PAGOS.md) |
| Perfil, billeteras, cuentas y natilleras (varias por persona) | `GET /me`, `GET /wallets/verify`, `GET·POST /accounts`, `GET·POST /natilleras`, `GET /natilleras/mine?natilleraId=`, `POST /natilleras/join`, `GET /invitations/{code}` | `deploy/natilleras` | [API-NATILLERAS](docs/API-NATILLERAS.md) |
| Préstamos | `GET /loans/simulate`, `GET·POST /loans/requests`, `GET /loans/mine`, `POST /loans/requests/{id}/repayment-grant`, `POST /loans/repayment/{grantId}/finish`, `POST /loans/requests/{id}/decision` (aprobar = desembolso) | `deploy/prestamos` | [API-PRESTAMOS](docs/API-PRESTAMOS.md) |
| Cuota automática | `POST /recurring`, `POST /recurring/{grantId}/finish`, `POST /recurring/{grantId}/charge-now` | `deploy/prestamos` | [API-PRESTAMOS](docs/API-PRESTAMOS.md#fase-2-y-cuota-automática-con-open-payments) |

Todos los `curl`, incluidas las pruebas negativas, están en [docs/CURLS.md](docs/CURLS.md). El contrato que usa la
app está en [`docs/openapi.yaml`](../docs/openapi.yaml) de la app (raíz del repo).

## Estado en `dev` (2026-10-17)

| Parte | Estado |
|---|---|
| Registro, login, perfil, billeteras y cuentas guardadas | ✅ desplegado y probado |
| Pago 1 a 1 EUR→COP y vista previa de la tasa | ✅ probado con la Test Wallet (pagos completados) |
| Natilleras: crear, invitar, unirse, varias por persona | ✅ desplegado y probado |
| Aporte al fondo | ✅ probado: 50.000 COP de un integrante, el fondo subió |
| Préstamos: simular, pedir, listar, rechazar | ✅ desplegado y probado |
| Préstamos: autorizar cuotas y desembolso al aprobar | ✅ **probado real** 2026-10-17: henry autorizó 2 cuotas, la tesorera aprobó y el fondo desembolsó $35.000 (cirocol → henry1); el fondo bajó a $415.000 |
| Cuota automática y «cobrar ahora» · cobro de cada cuota del préstamo | Desplegado sin probar · el cobro de las cuotas del préstamo (`paidCount`) no tiene ruta todavía: el permiso queda aprobado y se cobraría con un Scheduler |
| Cobro programado mensual (EventBridge Scheduler) | ❌ fuera del alcance de la hackatón: se cobra con `charge-now` |

## Desplegar

Requisitos: AWS CLI v2 con sesión en la cuenta del equipo, Node 22 y Python 3.

```bash
# Pagos (TypeScript + esbuild; el SDK de Open Payments va dentro del bundle)
cd deploy/payments && npm install && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-payments.sh

# Perfil, cuentas y natilleras
cd deploy/natilleras && npm install && npm test && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-natilleras.sh

# Préstamos y cuota automática
cd deploy/prestamos && npm install && npm test && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-prestamos.sh
```

Los zips de `deploy/*/dist` son el bundle de esbuild: el SDK y sus dependencias vienen incluidos, así que el código
propio está en `deploy/*/src`. Montaje manual inicial (Cognito, secreto, roles) en [docs/AWS-SETUP.md](docs/AWS-SETUP.md).
Prueba de punta a punta de un pago: `bash scripts/probar-pago.sh`.

Por ahora **solo una persona del equipo despliega** (la que tiene la CLI): los cambios llegan por PR a `david`.
Reglas para no pisarse: [docs/COORDINACION.md](docs/COORDINACION.md).

## Pruebas

`npm test` en `deploy/natilleras` (7 casos) y en `deploy/prestamos` (11 casos, con Open Payments falso) corre con un
DynamoDB en memoria, sin AWS ni red. Contra la Test Wallet se probaron pagos EUR → COP con outgoing payment completado
(ver [docs/REPORTE-DUVAN.md](docs/REPORTE-DUVAN.md)) y un aporte real en COP a una natillera.

## Seguridad

- La única llave es la del **cliente** de Open Payments (`natillera/open-payments-client`), y vive en Secrets Manager.
  Las personas **no** tienen llaves ni secretos: al registrarse solo dan la dirección pública de su billetera, y
  cada pago o permiso lo aprueban en su propia billetera (grant interactivo). No hay secretos en el repo.
- Los tokens de los grants recurrentes ya aprobados van en Secrets Manager (`natillera/grants/<grantId>`), nunca
  en DynamoDB ni en la respuesta a la app.
- La identidad sale solo del autorizador Cognito. En VTL, el username va escapado.
- Las billeteras se aceptan solo de los hosts permitidos (`ilp.interledger-test.dev`), y el `returnUrl` solo de una lista cerrada.
- El pago se finaliza una sola vez (`pending → processing` condicional) y el hash se verifica antes de continuar el grant.
- A quien no es dueño de un pago o de una solicitud se le responde 404, para no revelar ids ajenos.

## Uso de IA

Qué herramienta se usó, quién la usó y en qué archivos está en [AI_USAGE.md](AI_USAGE.md), y los prompts literales en
[`/prompts`](prompts/), según la [política de IA de la hackatón](https://interledger.org/hackathon/ai-policy/).

## Equipo

- **Backend:** Duvan Jaramillo y David Ciro.
- **App (y apoyo al backend):** Henry Taborda y Camilo.
