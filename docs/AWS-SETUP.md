# Montaje de la infra AWS (manual, consola)

Guía para crear a mano en la consola de AWS todo lo que pide [ARQUITECTURA.md](ARQUITECTURA.md).
Sin IaC: lo que se cree aquí se documenta aquí (nombre + configuración), para poder recrearlo y
después pasarlo a scripts de AWS CLI en `infra/`.

**Región:** `us-east-2` (Ohio) para todo. Revisar el selector de región arriba a la derecha
antes de crear cada recurso; un recurso en otra región "no existe" para los demás.

**Nunca** pegar en este archivo, en el repo ni en el chat: llaves privadas, contraseñas, access
keys de IAM ni tokens. Los IDs y ARNs sí se pueden anotar (no son secretos).

## Prioridad: P0 (pago 1 a 1 EUR→COP) antes de las 14:00 del 2026-10-16

Solo lo mínimo para P0, en este orden: **1 → 2 → 3 → 4 (solo `Users-info` y `Payments-history`)
→ 5 → 6 (Lambdas `start-payment` y `finish-payment`) → 7 (rutas de P0)**. El resto de tablas,
rutas y el paso 8 (Scheduler, P1) van después de las 15:00.

## Estado

| # | Paso | Estado | Fecha | Datos (no secretos) |
|---|---|---|---|---|
| 0 | Cuenta segura + alerta de costos | ✅ | 2026-10-16 | Account ID: `349607459198` · usuario `david-admin` · budget creado |
| 1 | Billeteras y llaves en la Test Wallet | 🟡 | 2026-10-16 | Wallet cliente (Duvan, EUR): `https://ilp.interledger-test.dev/f9a1abde` · Wallet COP (receptor P0): pendiente · Wallet fondo: pendiente |
| 2 | Secreto en Secrets Manager | ✅ | 2026-10-16 | ARN: `arn:aws:secretsmanager:us-east-2:349607459198:secret:natillera/open-payments-client-57Rtn0` |
| 3 | Cognito User Pool + App client | ✅ | 2026-10-16 | Pool `User pool - 3hc-ib` · ID `us-east-2_2pQzW95IK` · Client ID `20b10a2tnnr69lqlp2sf62orv0` (sin secreto, USER_PASSWORD_AUTH activo — verificado 2026-10-16) · trigger Pre sign-up → Lambda `pre-signup` (código en `deploy/pre-signup/index.mjs`) |
| 4 | Tablas DynamoDB (9) | ⬜ | | |
| 5 | Rol IAM de las Lambdas | ⬜ | | ARN: |
| 6 | Lambdas (cuando Duvan entregue código) | ⬜ | | |
| 7 | API Gateway + authorizer Cognito | ⬜ | | URL: |
| 8 | EventBridge Scheduler (flujos 12 / 12B) | ⬜ | | Rol: |

---

## Paso 0 · Cuenta segura y alerta de costos

1. Entrar como root → **IAM** → *Security credentials* del root → activar **MFA**.
2. No trabajar con root. **IAM → Users → Create user** `david-admin`, acceso a consola, política
   `AdministratorAccess`, activar MFA. Desde aquí, todo con ese usuario.
   (Si se suma Duvan más adelante: un usuario propio para él, no compartir credenciales.)
3. **Billing and Cost Management → Budgets → Create budget** → plantilla *Zero spend budget*
   (o *Monthly cost budget* de 5–10 USD) con tu correo. Avisa si algo empieza a cobrar.

Anotar el **Account ID** (12 dígitos) en la tabla de estado.

## Paso 1 · Billeteras y llaves en la Test Wallet de Interledger

Open Payments no crea billeteras: se crean a mano en la Test Wallet
(https://wallet.interledger-test.dev). Es dinero de prueba.

> **Decisión 2026-10-16:** se usa la Test Wallet de **Duvan**. Él genera las llaves y nos pasa,
> por un canal seguro (link que expira, no texto plano en el chat del grupo): URL de la wallet del
> cliente, Key ID y `private.key`; más las URLs de las wallets EUR, COP y del fondo. David carga
> la llave en Secrets Manager (paso 2) y borra su copia local al terminar.

1. Crear cuenta en la Test Wallet y completar el KYC de prueba.
2. Crear (o reutilizar) una cuenta y **dos wallet addresses**:
   - **Wallet del cliente (backend):** la identidad con la que el backend firma las peticiones de
     Open Payments.
   - **Wallet del fondo:** la billetera común de la natillera de demo (flujo 7).
   Para P0 hacen falta además **dos wallets de usuario de prueba**: una que paga en **EUR** y
   otra que recibe en **COP** (cada wallet address toma la moneda de la cuenta donde se crea, así
   que se necesita una cuenta EUR y una cuenta COP).
3. En la wallet del cliente: **Settings → Developer Keys → Generate keys**. Descarga
   `private.key` y muestra un **Key ID**.
   - Guardar `private.key` fuera del repo (p. ej. en tu gestor de contraseñas). No commitearlo.
4. Anotar en la tabla: URL de la wallet del cliente (`https://ilp.interledger-test.dev/...`) y de
   la del fondo. El Key ID va al secreto del paso 2.

## Paso 2 · Secrets Manager — llave del cliente Open Payments

**Secrets Manager → Store a new secret → Other type of secret → Plaintext**, con este JSON:

```json
{
  "walletAddressUrl": "https://ilp.interledger-test.dev/<wallet-del-cliente>",
  "keyId": "<Key ID del paso 1>",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
}
```

- `privateKey`: el contenido de `private.key` en una sola línea, con los saltos de línea como `\n`.
  Para no hacerlo a mano, en PowerShell en la carpeta donde está el archivo (lo deja en el
  portapapeles, no lo imprime):
  `((Get-Content .\private.key -Raw).Trim() -replace "\r?\n", '\n') | Set-Clipboard`
- En la Lambda, la llave se carga con `crypto.createPrivateKey(secret.privateKey)` y se pasa a
  `createAuthenticatedClient({ walletAddressUrl, keyId, privateKey })`.
- Nombre del secreto: **`natillera/open-payments-client`**. Sin rotación automática.
- Anotar el **ARN** en la tabla (lo necesita el rol IAM del paso 5).

## Paso 3 · Cognito — User Pool y App client

**Cognito → User pools → Create user pool**:

1. Tipo de aplicación: *Mobile app*. Nombre de la app: `natillera-mobile`.
2. Opciones de inicio de sesión: **Username** (el diagrama usa `username` único) y además email.
3. Atributos requeridos al registrarse: `email`, `phone_number`.
4. Política de contraseñas: la por defecto está bien.
5. Nombre del pool: **`natillera-users`**.
6. En el **App client** creado (`natillera-mobile`):
   - **Sin client secret** (es una app móvil).
   - Authentication flows: activar **`ALLOW_USER_PASSWORD_AUTH`** (login del flujo 2 con
     `InitiateAuth`) y `ALLOW_REFRESH_TOKEN_AUTH`.
   - Duración del access token: 60 min está bien.
7. Auto-confirmación (flujo 1): **trigger Pre sign-up** → Lambda `pre-signup`
   ([deploy/pre-signup/index.mjs](../deploy/pre-signup/index.mjs)), que verifica la wallet
   (`custom:walletId`), rechaza email/teléfono repetidos y pone `autoConfirmUser = true`.
   - Atributo personalizado requerido en el pool: **`custom:walletId`** (String, mutable), con
     permiso de escritura en el app client.
   - Lambda: Node.js 22.x, timeout 5 s (Cognito corta a los 5 s), rol con `cognito-idp:ListUsers`
     sobre el pool y `dynamodb:PutItem` sobre `Users-info`.
   - También guarda el usuario en la tabla **`user-info`** (variable `USER_VIEW_TABLE=user-info`),
     llave `source` (username) + `id` (1). En Pre sign-up todavía no existe el `sub`.
     Verificado 2026-10-16: el registro crea la fila con `assetCode` leído de la wallet.

Anotar **User pool ID** (`us-east-2_xxxx`) y **Client ID** en la tabla.

## Paso 4 · DynamoDB — 9 tablas

**DynamoDB → Tables → Create table**, para cada fila. Todas con **Capacity mode: On-demand**
(*Customize settings* → *On-demand*) y el resto por defecto. Tipo de llaves: **String**, salvo
donde dice Number.

| Tabla | Partition key | Sort key |
|---|---|---|
| `user-info` (creada así) | `source` (S) = username | `id` (N) = 1 |
| `Saved-accounts` | `author` (S) | `customWalletName` (S) |
| `Payments-history` | `paymentId` (S) | — |
| `natillera-registration` | `natilleraId` (S) | — |
| `natillera-records` | `natilleraId` (S) | `id` (N) |
| `natillera-loan-request` | `requestId` (S) | — |
| `Natillera-Loans-Records` | `loanId` (S) | — |
| `Recurring-grants` | `grantId` (S) | — |
| `Loan-payments` | `loanId` (S) | `n` (N) |

> ⚠️ Confirmar con Duvan antes de crear `natillera-records`: el diagrama dice `natilleraID`
> (con ID mayúscula) ahí y `natilleraId` en el resto. Aquí se propone **`natilleraId` en todas**.
> El nombre de una llave no se puede cambiar después sin borrar la tabla.

Índices secundarios (GSI) que probablemente pidan las lecturas del flujo 13 (crear cuando Duvan
lo confirme, se pueden añadir después sin borrar la tabla):
- `Payments-history`: GSI `author-index` (PK `author`) → "mi historial".
- `natillera-registration`: GSI `invitation-index` (PK `natilleraInvitation`) → flujo 8.
- `natillera-loan-request`: GSI `natilleraId-index` (PK `natilleraId`) → pendientes del admin.
- `Natillera-Loans-Records`: GSI `author-index` (PK `author`) → "mis préstamos".

## Paso 5 · Rol IAM de las Lambdas

**IAM → Roles → Create role** → *AWS service* → *Lambda*.

1. Adjuntar la política administrada `AWSLambdaBasicExecutionRole` (logs en CloudWatch).
2. Nombre: **`natillera-lambda-role`**.
3. Abrir el rol → *Add permissions* → *Create inline policy* → JSON (reemplazar `349607459198`,
   `us-east-2_2pQzW95IK` y el ARN del secreto), nombre `natillera-lambda-access`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoTables",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
                 "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:BatchGetItem"],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:349607459198:table/user-info",
        "arn:aws:dynamodb:us-east-2:349607459198:table/Saved-accounts",
        "arn:aws:dynamodb:us-east-2:349607459198:table/Payments-history",
        "arn:aws:dynamodb:us-east-2:349607459198:table/natillera-registration",
        "arn:aws:dynamodb:us-east-2:349607459198:table/natillera-records",
        "arn:aws:dynamodb:us-east-2:349607459198:table/natillera-loan-request",
        "arn:aws:dynamodb:us-east-2:349607459198:table/Natillera-Loans-Records",
        "arn:aws:dynamodb:us-east-2:349607459198:table/Recurring-grants",
        "arn:aws:dynamodb:us-east-2:349607459198:table/Loan-payments",
        "arn:aws:dynamodb:us-east-2:349607459198:table/*/index/*"
      ]
    },
    {
      "Sid": "OpenPaymentsKey",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-2:349607459198:secret:natillera/open-payments-client-57Rtn0"
    },
    {
      "Sid": "CognitoSignup",
      "Effect": "Allow",
      "Action": ["cognito-idp:AdminConfirmSignUp", "cognito-idp:AdminGetUser", "cognito-idp:ListUsers"],
      "Resource": "arn:aws:cognito-idp:us-east-2:349607459198:userpool/us-east-2_2pQzW95IK"
    }
  ]
}
```

(`SignUp` e `InitiateAuth` son llamadas públicas del app client y no necesitan permiso IAM. Los
permisos de EventBridge Scheduler se agregan en el paso 8.)

## Paso 6 · Lambdas (cuando Duvan entregue código)

Por cada handler que entregue Duvan:

1. **Lambda → Create function** → *Author from scratch*, runtime **Node.js 22.x**, arquitectura
   `arm64`, rol existente **`natillera-lambda-role`**.
2. Subir el `.zip` con el JS compilado desde TypeScript (Duvan define el build, p. ej. con esbuild).
3. *Configuration → General*: timeout **15 s** (Open Payments hace varias llamadas HTTP), memoria 256 MB.
4. *Configuration → Environment variables* (las mismas en todas):

| Variable | Valor |
|---|---|
| `OP_SECRET_ID` | `natillera/open-payments-client` |
| `COGNITO_USER_POOL_ID` | del paso 3 |
| `COGNITO_CLIENT_ID` | del paso 3 |
| `TABLE_USERS` … | nombres del paso 4 (acordar nombres de variables con Duvan) |

Nombres de función sugeridos: `natillera-<flujo>`, p. ej. `natillera-signup`,
`natillera-start-payment`, `natillera-finish-payment`.

## Paso 7 · API Gateway (HTTP API + authorizer JWT de Cognito)

Se usa **HTTP API** (más simple y barato, authorizer JWT nativo). Signup y login NO pasan por
aquí: la app los hace directo contra Cognito ([API-AUTH.md](API-AUTH.md)).

### 7.1 · Lambda de prueba `natillera-me` (GET /me) — opcional

Solo verifica la cadena login → token → API → Lambda → DynamoDB. No hace pagos. Se puede
saltar e ir directo a 7.2 con `start-payment`.

1. **Lambda → Create function** → `natillera-me`, Node.js 22.x, rol nuevo con permisos básicos.
2. Pegar [deploy/me/index.mjs](../deploy/me/index.mjs) como `index.mjs` → **Deploy**.
3. Variable de entorno `USER_VIEW_TABLE` = `user-info`.
4. Rol → política inline `natillera-me-dynamo`:
   ```json
   { "Version": "2012-10-17", "Statement": [{ "Effect": "Allow", "Action": "dynamodb:GetItem",
     "Resource": "arn:aws:dynamodb:us-east-2:349607459198:table/user-info" }] }
   ```

### 7.2 · Crear el API

1. **API Gateway → Crear API → API HTTP → Crear**.
2. Integraciones: **Lambda** → `natillera-me` (región us-east-2), versión de payload **2.0**.
3. Nombre del API: **`natillera-api`** → Siguiente.
4. Rutas: `GET` `/me` → integración `natillera-me` → Siguiente.
5. Etapas: dejar **`$default`** con *implementación automática* → Siguiente → **Crear**.
6. Anotar la **URL de invocación** (`https://xxxx.execute-api.us-east-2.amazonaws.com`).

### 7.3 · Authorizer JWT (Cognito)

1. En el API → **Autorización** → pestaña *Administrar autorizadores* → **Crear**:
   - Tipo: **JWT** · Nombre: `cognito-jwt`
   - Emisor (issuer): `https://cognito-idp.us-east-2.amazonaws.com/us-east-2_2pQzW95IK`
   - Audiencia: `20b10a2tnnr69lqlp2sf62orv0` (Client ID)
   - Origen de identidad: `$request.header.Authorization` (por defecto)
2. Pestaña *Adjuntar autorizadores a rutas* → `GET /me` → `cognito-jwt` → **Adjuntar**.
   Toda ruta nueva (salvo las públicas) debe llevar este autorizador.

### 7.4 · Probar

```bash
curl -i https://<URL>/me
```
→ **401** `{"message":"Unauthorized"}` (sin token).

```bash
curl -i https://<URL>/me -H "Authorization: Bearer <AccessToken>"
```
→ **200** con el usuario de `Users-info` (un usuario creado después del cambio de pre-signup).

### 7.5 · `start-payment` (P0) → `POST /payments` (ruta según `docs/openapi.yaml` del front)

**Antes, en AWS:**
1. Tabla **`payments-history`**: PK `paymentId` (String), on-demand. (Confirmar nombre y llaves con Duvan.)
2. Lambda **`start-payment`**: Node.js 22.x, timeout **20 s** (API Gateway corta a los 30 s),
   memoria 512 MB. Variables: `OP_SECRET_ID=natillera/open-payments-client`,
   `PAYMENTS_TABLE=payments-history`, `USER_VIEW_TABLE=user-info` y la URL de retorno de la
   billetera (deep link de la app) que Duvan defina.
3. Rol de la Lambda, política inline:
   ```json
   { "Version": "2012-10-17", "Statement": [
     { "Effect": "Allow", "Action": "secretsmanager:GetSecretValue",
       "Resource": "arn:aws:secretsmanager:us-east-2:349607459198:secret:natillera/open-payments-client-57Rtn0" },
     { "Effect": "Allow", "Action": ["dynamodb:PutItem", "dynamodb:GetItem"],
       "Resource": ["arn:aws:dynamodb:us-east-2:349607459198:table/payments-history",
                    "arn:aws:dynamodb:us-east-2:349607459198:table/user-info"] } ] }
   ```

**El código no se puede pegar en el editor de la consola:** usa `@interledger/open-payments`, que
no viene en el runtime. Duvan (o quien tenga el repo) genera un bundle y se sube como `.zip`:

```bash
npx esbuild app/src/handlers/start-payment.handler.ts --bundle --platform=node --target=node22 --format=cjs --outfile=dist/start-payment/index.js
```
Comprimir **solo** `index.js` (en la raíz del zip) → Lambda → *Code* → *Upload from* → *.zip file*.
Handler: `index.handler`. (Ajustar la ruta del `.ts` al nombre real del archivo.)

**En el API:** *Rutas → Crear* → `POST /payments` (o la ruta exacta de `openapi.yaml`) → integración Lambda `start-payment`
(payload 2.0) → adjuntar autorizador `cognito-jwt`.

**Contrato para el código** (HTTP API, payload 2.0):
- Usuario: `event.requestContext.authorizer.jwt.claims.username` (y `.sub`). Nunca del body.
- Body: `JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body)`.
- Respuesta: `{ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, redirectUrl, debitAmount, receiveAmount }) }`
  (`debitAmount` y `receiveAmount` salen de la quote; el front los muestra antes de aprobar).
- **`returnUrl` del body** (pedido del front): es la dirección a la que vuelve la app tras aprobar
  en la billetera — `natillera://retorno` (APK) o `exp://...` (Expo Go). Usarla como
  `interact.finish.uri`, **solo si empieza por `natillera://` o `exp://`**; cualquier otra cosa → 400
  (si no, cualquiera podría mandar a la persona a un sitio externo con el `interact_ref`).
- El grant interactivo lleva `interact: { start: ['redirect'], finish: { method: 'redirect', uri: <deep link>, nonce } }`;
  guardar el `nonce` en `payments-history` para verificar el `hash` al volver (flujo 4).

### 7.6 · Rutas siguientes

Cuando Duvan entregue cada Lambda: **Rutas → Crear** → método + path → integración Lambda →
adjuntar `cognito-jwt`. Rutas tentativas: `POST /payments/start`, `POST /payments/finish`
(P0); `POST /accounts`, `POST /accounts/pay`, `POST /natilleras`, `POST /natilleras/join`,
`POST /natilleras/savings`, `POST /recurring/start`, `POST /recurring/finish`, préstamos y los
`GET` del flujo 13. CORS: no hace falta para la app nativa.

## Paso 8 · EventBridge Scheduler (flujos 12 y 12B)

Se monta cuando existan las Lambdas `charge-recurring` y `charge-loan-installment`.

1. Rol `natillera-scheduler-role` (servicio de confianza `scheduler.amazonaws.com`) con permiso
   `lambda:InvokeFunction` sobre esas dos Lambdas.
2. Las Lambdas que crean schedules necesitan además `scheduler:CreateSchedule`,
   `scheduler:DeleteSchedule` e `iam:PassRole` sobre `natillera-scheduler-role` (agregar al rol del paso 5).
3. Grupo de schedules: `natillera`.

---

## Pendiente de acordar con Duvan

- `natilleraId` vs `natilleraID` (paso 4) — antes de crear `natillera-records`.
- Auto-confirmación: `AdminConfirmSignUp` o trigger Pre sign-up (paso 3).
- Nombres de variables de entorno y rutas exactas del API (pasos 6 y 7).
- GSIs que necesitan sus queries (paso 4).
- URL de retorno de la billetera (`interact.finish`): el deep link de la app React Native al que
  vuelve la persona con `interact_ref` (flujos 3/4).
