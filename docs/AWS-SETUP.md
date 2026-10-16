# Montaje de la infra AWS (manual, consola)

Guía para crear a mano en la consola de AWS todo lo que pide [ARQUITECTURA.md](ARQUITECTURA.md).
Sin IaC: lo que se cree aquí se documenta aquí (nombre + configuración), para poder recrearlo y
después pasarlo a scripts de AWS CLI en `infra/`.

**Región:** `us-east-1` (N. Virginia) para todo. Revisar el selector de región arriba a la derecha
antes de crear cada recurso; un recurso en otra región "no existe" para los demás.

**Nunca** pegar en este archivo, en el repo ni en el chat: llaves privadas, contraseñas, access
keys de IAM ni tokens. Los IDs y ARNs sí se pueden anotar (no son secretos).

## Estado

| # | Paso | Estado | Fecha | Datos (no secretos) |
|---|---|---|---|---|
| 0 | Cuenta segura + alerta de costos | ✅ | 2026-10-16 | Account ID: (pendiente de anotar) · usuario `david-admin` · budget creado |
| 1 | Billeteras y llaves en la Test Wallet | ⬜ | | Wallet cliente: · Wallet fondo: |
| 2 | Secreto en Secrets Manager | ⬜ | | ARN: |
| 3 | Cognito User Pool + App client | ⬜ | | Pool ID: · Client ID: |
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

1. Crear cuenta en la Test Wallet y completar el KYC de prueba.
2. Crear (o reutilizar) una cuenta y **dos wallet addresses**:
   - **Wallet del cliente (backend):** la identidad con la que el backend firma las peticiones de
     Open Payments.
   - **Wallet del fondo:** la billetera común de la natillera de demo (flujo 7).
   Para la demo también hace falta al menos una wallet por usuario de prueba.
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
7. Auto-confirmación (flujo 1): el backend llama `SignUp` y luego `AdminConfirmSignUp`, así que
   no hace falta configurar correo de verificación para la demo. (Alternativa: trigger *Pre sign-up*
   que haga `autoConfirmUser = true`; se decide con Duvan.)

Anotar **User pool ID** (`us-east-1_xxxx`) y **Client ID** en la tabla.

## Paso 4 · DynamoDB — 9 tablas

**DynamoDB → Tables → Create table**, para cada fila. Todas con **Capacity mode: On-demand**
(*Customize settings* → *On-demand*) y el resto por defecto. Tipo de llaves: **String**, salvo
donde dice Number.

| Tabla | Partition key | Sort key |
|---|---|---|
| `Users-info` | `userId` (S) | — |
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
3. Abrir el rol → *Add permissions* → *Create inline policy* → JSON (reemplazar `<ACCOUNT_ID>`,
   `<USER_POOL_ID>` y el ARN del secreto), nombre `natillera-lambda-access`:

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
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/Users-info",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/Saved-accounts",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/Payments-history",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/natillera-registration",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/natillera-records",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/natillera-loan-request",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/Natillera-Loans-Records",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/Recurring-grants",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/Loan-payments",
        "arn:aws:dynamodb:us-east-1:<ACCOUNT_ID>:table/*/index/*"
      ]
    },
    {
      "Sid": "OpenPaymentsKey",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "<ARN del secreto natillera/open-payments-client>"
    },
    {
      "Sid": "CognitoSignup",
      "Effect": "Allow",
      "Action": ["cognito-idp:AdminConfirmSignUp", "cognito-idp:AdminGetUser"],
      "Resource": "arn:aws:cognito-idp:us-east-1:<ACCOUNT_ID>:userpool/<USER_POOL_ID>"
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

## Paso 7 · API Gateway

Recomendado: **HTTP API** (más simple y barato, authorizer JWT nativo para Cognito). Si el
equipo decide usar VTL (decisión abierta 4), tendría que ser **REST API**.

1. **API Gateway → Create API → HTTP API** → nombre `natillera-api`, stage `$default` con auto-deploy.
2. **Authorization → Create authorizer → JWT**:
   - Issuer: `https://cognito-idp.us-east-1.amazonaws.com/<USER_POOL_ID>`
   - Audience: el **Client ID** del paso 3.
3. Rutas (una integración Lambda por ruta). Todas con el authorizer **excepto** signup y login:
   `POST /signup`, `POST /login`, `POST /payments/start`, `POST /payments/finish`,
   `POST /accounts`, `POST /accounts/pay`, `POST /natilleras`, `POST /natilleras/join`,
   `POST /natilleras/savings`, `POST /loans/requests`, `POST /loans/requests/decision`,
   `POST /recurring/start`, `POST /recurring/finish`, `POST /loans/repayment/start`,
   `POST /loans/repayment/finish`, y los `GET` del flujo 13.
   (Rutas tentativas: ajustarlas a lo que implemente Duvan.)
4. **CORS**: no hace falta para la app nativa; sí si se prueba desde un navegador.
5. Anotar la **Invoke URL** en la tabla.

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
