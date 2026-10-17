# Reporte del backend para Duvan — 2026-10-16 (noche)

Resumen de lo que se hizo desde la rama `david` y en AWS, para que tengas contexto. Lo detallado está
en los documentos enlazados; aquí va el "qué, por qué y dónde".

## 1. Estado en una línea

**El pago 1 a 1 EUR→COP funciona de punta a punta (P0 logrado).** Usuario `ciro-demo-euro`
(wallet `ciroeur`, EUR) le pagó a `cirocol` (COP): 2,13 EUR → 4.000 COP, pago `a03971c1…`, con
outgoing payment real en el testnet. Registro, login y las 4 rutas de pagos están desplegados en `dev`.

URL base: `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev` (cuenta 349607459198, us-east-2).

## 2. Qué hay desplegado

| Pieza | Qué hace | Código |
|---|---|---|
| Cognito `us-east-2_2pQzW95IK` + app client `20b10a2tnnr69lqlp2sf62orv0` | Registro y login (USER_PASSWORD_AUTH). El API valida el **IdToken**. | — |
| Lambda `pre-signup` | Verifica que la wallet exista (solo host `ilp.interledger-test.dev`), rechaza email/teléfono repetidos, guarda en `user-info` (`source`=username, `id`=1) y auto-confirma. | `deploy/pre-signup/index.mjs` |
| Lambda `start-payment` → `POST /payments` | Crea incoming payment, quote y grant interactivo; devuelve `redirectUrl` para aprobar en la wallet. | `deploy/payments/src/start-payment.ts` |
| Lambda `return-payment` → `GET /payments/{id}/return` (pública) | A donde vuelve la billetera tras aprobar. Verifica el hash, finaliza el pago y redirige a la app (`natillera://retorno?paymentId=…&result=ok`). | `src/return-payment.ts` |
| Lambda `finish-payment` → `POST /payments/{id}/finish` | Respaldo: la app manda `interact_ref` + `hash`. Idempotente. | `src/finish-payment.ts` |
| Lambda `get-payment` → `GET /payments/{id}` y `GET /payments` | Estado de un pago o historial del usuario (GSI `author-index`). | `src/get-payment.ts` |
| DynamoDB `user-info`, `payments-history` | Usuarios y pagos. | — |
| Secrets Manager `natillera/open-payments-client` | Llave del **cliente** Open Payments (tu wallet `f9a1abde`). Es el único secreto que usan las Lambdas. | — |

Todo se despliega con `infra/deploy-payments.sh` (AWS CLI, idempotente, sin IaC como acordamos).
El script **publica una versión de respaldo** de cada Lambda antes de reemplazarla.

## 3. Cómo funciona un pago (resumen)

1. App → `POST /payments` con `{ kind:'p2p', walletAddress, value, assetCode, assetScale, returnUrl }`.
   El usuario sale del token (nunca del body).
2. `start-payment` habla con Open Payments y devuelve `redirectUrl`.
3. La persona abre `redirectUrl` **con la cuenta dueña de la wallet que paga** y da *Accept*.
4. La wallet vuelve a `GET /payments/{id}/return` → `return-payment` verifica hash, hace
   `grant.continue` + outgoing payment, guarda `completed` y redirige a la app.
5. La app consulta `GET /payments/{id}`.

El código común está en `src/shared.ts` (cliente, usuario, errores, validación de `returnUrl`) y
`src/complete.ts` (finalización atómica `pending → processing`, para no pagar dos veces).

Las rutas usan **VTL (sin proxy)** como quisiste: la plantilla arma
`{ "auth": { "username": … }, "paymentId": …, "body": … }`. Las Lambdas leen el modo de la
variable `INTEGRATION_MODE=vtl`. Errores: la Lambda lanza `[400] {json}` y la respuesta de
integración lo mapea al status real. Detalle en `docs/API-PAGOS.md`.

## 4. Cosas que aprendimos (importante)

- **"Internal Server Error" en la Test Wallet no significa que el pago falló.** Su backend convierte
  en 500 cualquier error de Rafiki que no sea el texto `'Bad Request'` (p. ej. un segundo Accept).
  En nuestra prueba salió el 500 **y el pago quedó `completed`**. Siempre revisar `GET /payments/{id}`.
- **Tu wallet como cliente funciona bien**; no hay que cambiar el secreto.
- Si el enlace de aprobación lo abre **otra cuenta** de la Test Wallet, el grant se rechaza solo.
- Con **monto fijo en EUR** hacia COP, Rafiki falla la cotización (`non-positive receive amount`).
  Con **monto fijo en la moneda de quien recibe** (COP) funciona. Pendiente de revisar.
- La interacción vence en ~10 minutos.

## 5. Incidentes de hoy (para no repetirlos)

1. **`start-payment` desde la consola:** tu versión pedía la variable `USERS_VIEW_TABLE` (no existía,
   daba `tableName null`). Se dejó la del repo; tus versiones quedaron como **versiones 3 y 4** de la
   Lambda por si las necesitas.
2. **El registro dejó de funcionar** (`exports is not defined in ES module scope`): a las 19:37 se
   subió un `start-payment` compilado a CommonJS **dentro de la Lambda `pre-signup`**. Se guardó como
   **versión 1** de `pre-signup` y se restauró el código del repo. **Antes de subir por consola, revisar
   el nombre de la Lambda.**

Propuesta para evitar choques: los cambios entran por el repo (rama → PR) y se despliegan con los
scripts de `infra/`. Si necesitas probar algo en la consola, avisa por el grupo antes.

## 6. Lo que está en curso

**Bloque A del front (natilleras, cuentas guardadas y `/me`).** Camilo/Henry lo escribieron en el repo
del front, rama `back/feat-natilleras`; lo traje como rama local `feat/natilleras`. Son 8 Lambdas
nuevas con el mismo patrón VTL, y su script `infra/deploy-natilleras.sh`:

| Ruta | Lambda |
|---|---|
| `GET /me` | `get-me` |
| `GET /wallets/verify?url=` | `verify-wallet` |
| `POST /accounts`, `GET /accounts` | `save-account`, `list-accounts` |
| `POST /natilleras`, `GET /natilleras/mine` | `create-natillera`, `get-my-natillera` |
| `POST /natilleras/join`, `GET /invitations/{code}` | `join-natillera`, `get-invitation` |

Tablas nuevas: `saved-accounts` (`author` + `customWalletName`), `natillera-registration`
(`natilleraId`, índice `invitation-index`), `natillera-records` (`natilleraId` + `id`).

Revisión hasta ahora: el código está bien (identidad solo del token, allowlist de hosts, escrituras
condicionales, no toca las Lambdas de pagos). Verificado en AWS: no existe ninguna de esas tablas,
Lambdas ni rutas, así que no hay choques. `start-payment` ya lee `natillera-registration` con las
mismas llaves (`natilleraId`, `walletAddress`, `integrants`), así que los aportes encajan. Falta:
correr sus tests y desplegar. Además piden agregar `NATILLERA_RECORDS_TABLE` a
`finish-payment` y `return-payment` para que los aportes (`kind:'aporte'`) sumen al fondo.

Henry subirá préstamos igual, en `back/feat-prestamos`.

## 7. Pendientes

- Desplegar el bloque A y probar las rutas con el front.
- Revisar la cotización con monto fijo en la moneda de quien envía.
- `openapi.yaml` acordado con el front.
- Rama `main` como default y PR `david → main` (code freeze sábado 2026-10-17 11:00).
- Después de la demo: rotar la llave del cliente en la Test Wallet.

## 8. Dónde leer más

- `docs/API.md` — vista general del API. `docs/API-PAGOS.md` — pagos y VTL. `docs/API-AUTH.md` — registro/login.
- `docs/CURLS.md` — todos los requests. `scripts/probar-pago.sh` — prueba interactiva.
- `docs/ARQUITECTURA.md` — flujos y tablas. `docs/AWS-SETUP.md` — recursos en AWS.
- `MEMORY.md` — bitácora de decisiones e infraestructura.
