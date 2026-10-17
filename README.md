# Natillera sin Fronteras — backend

> **EN:** Serverless backend (AWS Lambda + API Gateway + Cognito + DynamoDB) for a cross-border family
> savings circle. Every payment goes through **Open Payments**: incoming payment on the receiver's wallet,
> quote on the sender's, and an interactive grant the person approves in their own wallet. Only the backend
> holds the client key. Built for the Interledger Open Payments Hackathon (Medellín, Oct 16–17, 2026).
> Mobile app: [interledger-natillera-sinfronteras-frontend](https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend).

Una **natillera** es un fondo de ahorro en familia. Este backend permite que cada integrante ponga su cuota desde
su propia billetera, en su moneda, a la billetera común del fondo. También permite pagarle a otra persona y llevar
las cuentas de la natillera (quién puso, cuánto hay, quién debe).

## Arquitectura

```
App (Expo) ──IdToken──▶ API Gateway REST (stage dev, autorizador Cognito)
                              │
                              ├─ Lambdas de pagos ── SDK @interledger/open-payments ──▶ Test Wallet (Rafiki)
                              │        └─ llave del cliente: Secrets Manager (natillera/open-payments-client)
                              ├─ Lambdas de natilleras, cuentas, perfil y préstamos (solo DynamoDB)
                              └─ DynamoDB: user-info, payments-history, natillera-registration,
                                           natillera-records, saved-accounts, natillera-loan-request
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
   - responde 302 a la app (`natillera://retorno?paymentId=…&result=…`), siempre que el `returnUrl` esté en una lista cerrada.
4. `GET /payments/{id}` da el estado final. `POST /payments/{id}/finish` queda como respaldo idempotente.

Si es un **aporte** a la natillera, al quedar `completed` se registra en `natillera-records` y suma al fondo.
Detalle en [docs/API-PAGOS.md](docs/API-PAGOS.md).

## Rutas

| Bloque | Rutas | Código | Doc |
|---|---|---|---|
| Registro y login | Cognito `SignUp` / `InitiateAuth` + trigger `pre-signup` | `deploy/pre-signup` | [API-AUTH](docs/API-AUTH.md) |
| Pagos | `POST /payments`, `GET /payments`, `GET /payments/{id}`, `POST /payments/{id}/finish`, `GET /payments/{id}/return` | `deploy/payments` | [API-PAGOS](docs/API-PAGOS.md) |
| Perfil, billeteras, cuentas y natilleras | `GET /me`, `GET /wallets/verify`, `GET·POST /accounts`, `POST /natilleras`, `GET /natilleras/mine`, `POST /natilleras/join`, `GET /invitations/{code}` | `deploy/natilleras` | [API-NATILLERAS](docs/API-NATILLERAS.md) |
| Préstamos (fase 1, sin Open Payments) | `GET /loans/simulate`, `GET·POST /loans/requests`, `GET /loans/mine`, `POST /loans/requests/{id}/decision` | `deploy/prestamos` | [API-PRESTAMOS](docs/API-PRESTAMOS.md) |

Todos los `curl`, incluidas las pruebas negativas, están en [docs/CURLS.md](docs/CURLS.md). El contrato que usa la
app está en [`docs/openapi.yaml`](https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/blob/main/docs/openapi.yaml) del front.

**Pendiente (fase 2):**
- el desembolso del préstamo y la autorización del cobro de cuotas (grant recurrente);
- el aporte mensual automático.

La app los muestra en modo demo.

## Desplegar

Requisitos: AWS CLI v2 con sesión en la cuenta del equipo, Node 22 y Python 3.

```bash
# Pagos (TypeScript + esbuild; el SDK de Open Payments va dentro del bundle)
cd deploy/payments && npm install && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-payments.sh

# Perfil, cuentas y natilleras
cd deploy/natilleras && npm install && npm test && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-natilleras.sh

# Préstamos (fase 1)
cd deploy/prestamos && npm install && npm test && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-prestamos.sh
```

Los zips de `deploy/*/dist` son el bundle de esbuild: el SDK y sus dependencias vienen incluidos, así que el código
propio está en `deploy/*/src`. Montaje manual inicial (Cognito, secreto, roles) en [docs/AWS-SETUP.md](docs/AWS-SETUP.md).
Prueba de punta a punta de un pago: `bash scripts/probar-pago.sh`.

## Pruebas

`npm test` en `deploy/natilleras` y en `deploy/prestamos` corre con un DynamoDB en memoria, sin AWS ni red. El pago
real se probó contra la Test Wallet: EUR → COP, con outgoing payment completado (ver [docs/REPORTE-DUVAN.md](docs/REPORTE-DUVAN.md)).

## Seguridad

- La única llave es la del **cliente** de Open Payments, y vive en Secrets Manager. No hay secretos en el repo.
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
