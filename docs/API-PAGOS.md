# Pagos 1 a 1 (P0): despliegue y prueba

Lambdas de los flujos 3 y 4 en [`deploy/payments`](../deploy/payments), escritas según el contrato
del front (`docs/api-contrato.md` del repo del front). **Pendiente de revisión de Duvan.**

| Ruta (HTTP API, con authorizer `cognito-jwt`) | Lambda | Hace |
|---|---|---|
| `POST /payments` | `start-payment` | Incoming payment + quote + grant interactivo → `{ paymentId, redirectUrl, debitAmount, receiveAmount }` |
| `POST /payments/{id}/finish` | `finish-payment` | Verifica el hash, continúa el grant con `interact_ref`, crea el outgoing payment → estado final |
| `GET /payments/{id}` | `get-payment` | Estado del pago (polling de la pantalla 30) |
| `GET /payments` | `get-payment` | Historial de la persona (necesita el GSI `author-index`) |

## API desplegado (2026-10-16)

- **Tipo:** API **REST** con autorizador **Cognito user pool**, stage `dev`.
- **URL base:** `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev`
- **Token:** con el autorizador Cognito de un API REST (sin scopes OAuth) se manda el **`IdToken`**
  del login, no el `AccessToken`: `Authorization: Bearer <IdToken>`. En el front:
  `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id`.
- **Integración: sin proxy, con plantillas de mapeo VTL** (decisión de Duvan). Las Lambdas también
  funcionan con proxy; el modo se elige **por configuración**, no por la forma del evento.

### Seguridad: obligatorio en modo VTL

1. En las 3 Lambdas, variable de entorno **`INTEGRATION_MODE=vtl`** (sin ella esperan proxy y
   responden 401).
2. En **cada método** → *Solicitud de integración* → **Transferencia del cuerpo de la solicitud:
   Nunca**. Si no, una petición con un `Content-Type` sin plantilla pasaría el body crudo como
   evento, y alguien podría mandar `{"auth":{"username":"otra-persona"}}` y actuar como ella.
3. La identidad va **solo** en `auth.username` desde el autorizador; el body va completo en `body`.
   Nunca poner campos del body sueltos al lado de la identidad.

### Plantillas de solicitud de integración (Content-Type `application/json`)

`POST /payments` → `start-payment`
```velocity
{
  "auth": { "username": "$context.authorizer.claims['cognito:username']" },
  "body": $input.json('$')
}
```

`POST /payments/{id}/finish` → `finish-payment`
```velocity
{
  "auth": { "username": "$context.authorizer.claims['cognito:username']" },
  "paymentId": "$util.escapeJavaScript($input.params('id'))",
  "body": $input.json('$')
}
```

`GET /payments/{id}` → `get-payment`
```velocity
{
  "auth": { "username": "$context.authorizer.claims['cognito:username']" },
  "paymentId": "$util.escapeJavaScript($input.params('id'))"
}
```

`GET /payments` → `get-payment`
```velocity
{
  "auth": { "username": "$context.authorizer.claims['cognito:username']" }
}
```

**La plantilla actual de `start-payment` (campos sueltos con `username` arriba) ya no sirve:**
hay que reemplazarla por la de arriba.

### Respuestas de error (sin proxy)

Sin proxy, la Lambda devuelve el objeto de la respuesta (200) o falla con
`[<status>] {"error":"…","message":"…"}`. Para que el front reciba el status real, en **cada método**:

1. **Respuesta de método** → agregar los códigos `400`, `401`, `403`, `404`, `500` y `502`.
2. **Respuesta de integración** → *Crear respuesta*, una por código:
   - Expresión regular de error de Lambda: `\[400\].*` (y `\[401\].*`, `\[403\].*`, `\[404\].*`,
     `\[500\].*`, `\[502\].*`)
   - Código de estado de respuesta del método: el mismo número.
   - Plantilla de mapeo `application/json` (quita el prefijo `[400] ` y deja el JSON):
     ```velocity
     #set($msg = $input.path('$.errorMessage'))
     $msg.substring(6)
     ```
3. La respuesta **200** por defecto se deja sin plantilla (pasa el objeto tal cual).
4. **Implementar API** → stage `dev`.

Sin el paso 2, los errores llegan como **200** con `{"errorMessage": "[400] …"}`.

### Rutas

Según el contrato del front: `/payments` (POST → start, GET → get), `/payments/{id}` (GET → get),
`/payments/{id}/finish` (POST → finish), todos con `cognito_authorizer`. Hoy existe
`/start-payment`; el front llama `POST /payments`.

## Contrato

**`POST /payments`**

```json
{
  "kind": "p2p",
  "customWalletName": "mamá",
  "value": "1000",
  "assetCode": "EUR",
  "assetScale": 2,
  "returnUrl": "natillera://retorno"
}
```

- `kind: "p2p"`: a quién se le paga va en `customWalletName` (cuenta guardada en `saved-accounts`,
  flujo 6). **Extensión para pruebas de P0:** en vez de `customWalletName` se puede mandar
  `walletAddress` (URL de la Test Wallet).
- `kind: "aporte"`: `natilleraId` (+ `author` opcional: el socio al que se abona). Verifica que
  quien paga sea integrante de la natillera.
- Monto en unidades menores (`"1000"` = 10,00). Si el `assetCode`/`assetScale` son los de quien
  **recibe**, se fija lo que llega; si son los de quien **paga**, se fija lo que sale. Otro → 400.
- `returnUrl`: solo `natillera://retorno` o `exp://<host>[:puerto]/--/retorno`. Otro → 400.
- Quien paga sale del token (`username` → `user-info.walletAddress`), nunca del body.

Respuesta 200:

```json
{
  "paymentId": "4f6c…",
  "redirectUrl": "https://auth.interledger-test.dev/interact/…",
  "debitAmount": { "value": "1000", "assetCode": "EUR", "assetScale": 2 },
  "receiveAmount": { "value": "450000", "assetCode": "COP", "assetScale": 2 }
}
```

La app abre `redirectUrl`; al aprobar, la billetera vuelve a
`<returnUrl>?paymentId=…&interact_ref=…&hash=…` (opción A del contrato).

**`POST /payments/{id}/finish`** — body `{ "interact_ref": "…", "hash": "…" }`. Responde el pago:

```json
{
  "paymentId": "4f6c…",
  "kind": "p2p",
  "status": "completed",
  "counterpartName": "…",
  "debitAmount": { "value": "1000", "assetCode": "EUR", "assetScale": 2 },
  "receiveAmount": { "value": "450000", "assetCode": "COP", "assetScale": 2 },
  "createdAt": "…",
  "updatedAt": "…"
}
```

`status`: `pending | completed | rejected | failed`. Es idempotente: si se llama dos veces,
devuelve el estado sin pagar dos veces. Si la persona rechazó en la billetera → `rejected`.

**`GET /payments/{id}`** → mismo objeto. **`GET /payments`** → lista (más recientes primero).

Errores: `{ "error": "…", "message": "…" }` con 400 (validación), 401 (sin token), 403 (no es
integrante), 404 (pago, cuenta o natillera no existe, o es de otra persona), 502 (Open Payments
rechazó algo; el `message` trae la descripción).

## Desplegar (consola, us-east-2)

### 1 · Generar los .zip

```bash
cd deploy/payments
npm install
npm run build
```

Deja `dist/start-payment.zip`, `dist/finish-payment.zip` y `dist/get-payment.zip`. Cada uno trae
solo `index.js` (el SDK de Open Payments va dentro; el AWS SDK lo pone el runtime).

### 2 · Tablas DynamoDB

| Tabla | Llaves | Para P0 |
|---|---|---|
| `payments-history` | PK `paymentId` (S) · GSI **`author-index`**: PK `author` (S), SK `createdAt` (S), proyección **All** | Obligatoria |
| `user-info` | ya existe (PK `source`, SK `id`) | Ya está |
| `saved-accounts` | PK `author` (S), SK `customWalletName` (S) | Solo si se paga por `customWalletName` |
| `natillera-registration` | PK `natilleraId` (S) | Solo para `kind: "aporte"` |

### 3 · Rol IAM compartido `natillera-payments-role`

Rol de Lambda con `AWSLambdaBasicExecutionRole` + política inline:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-2:349607459198:secret:natillera/open-payments-client-57Rtn0" },
    { "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:us-east-2:349607459198:table/payments-history",
        "arn:aws:dynamodb:us-east-2:349607459198:table/payments-history/index/*",
        "arn:aws:dynamodb:us-east-2:349607459198:table/user-info",
        "arn:aws:dynamodb:us-east-2:349607459198:table/saved-accounts",
        "arn:aws:dynamodb:us-east-2:349607459198:table/natillera-registration",
        "arn:aws:dynamodb:us-east-2:349607459198:table/natillera-records"
      ] }
  ]
}
```

### 4 · Las 3 Lambdas

Para cada una: **Create function** → nombre (`start-payment`, `finish-payment`, `get-payment`) →
Node.js 22.x → rol existente `natillera-payments-role` → *Code → Upload from → .zip* → handler
`index.handler`.

| Lambda | Timeout | Memoria |
|---|---|---|
| `start-payment` | 25 s | 512 MB |
| `finish-payment` | 25 s | 512 MB |
| `get-payment` | 10 s | 256 MB |

Variables de entorno (todas opcionales; estos son los valores por defecto):
`OP_SECRET_ID=natillera/open-payments-client`, `USER_VIEW_TABLE=user-info`,
`PAYMENTS_TABLE=payments-history`, `SAVED_ACCOUNTS_TABLE=saved-accounts`,
`NATILLERAS_TABLE=natillera-registration`, `WALLET_HOSTS=ilp.interledger-test.dev`.
En `finish-payment`, `NATILLERA_RECORDS_TABLE=natillera-records` activa el registro de aportes.

### 5 · Rutas en `natillera-api`

*Rutas → Crear* (integración Lambda, payload 2.0) y adjuntar `cognito-jwt` a cada una:
`POST /payments` → `start-payment` · `POST /payments/{id}/finish` → `finish-payment` ·
`GET /payments/{id}` → `get-payment` · `GET /payments` → `get-payment`.

## Probar el flujo completo (curl)

Necesitas: la **URL del API**, un usuario registrado cuya wallet (`custom:walletId`) sea la que
**paga** (p. ej. `prueba1` → `f9a1abde`, EUR) y el **login de la Test Wallet** de esa wallet, y
otra wallet que **reciba** (p. ej. la COP).

```bash
API=https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev
```

**1. Login** (copiar el **`IdToken`**, porque el API es REST con autorizador Cognito):

```bash
curl -s https://cognito-idp.us-east-2.amazonaws.com/ -H 'Content-Type: application/x-amz-json-1.1' -H 'X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth' -d '{"ClientId":"20b10a2tnnr69lqlp2sf62orv0","AuthFlow":"USER_PASSWORD_AUTH","AuthParameters":{"USERNAME":"prueba1","PASSWORD":"<clave>"}}'
```

```bash
TOKEN=<IdToken>
```

**2. Iniciar pago** (10,00 EUR desde la wallet de `prueba1` a la wallet que recibe):

```bash
curl -s -X POST "$API/payments" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"kind":"p2p","walletAddress":"https://ilp.interledger-test.dev/<wallet-que-recibe>","value":"1000","assetCode":"EUR","assetScale":2,"returnUrl":"exp://localhost:8081/--/retorno"}'
```

Devuelve `paymentId`, `redirectUrl`, `debitAmount` y `receiveAmount`.

**3. Aprobar en la billetera:** abrir `redirectUrl` en Chrome con la sesión de la Test Wallet de
quien paga → **Aceptar**. La billetera intenta abrir
`exp://localhost:8081/--/retorno?paymentId=…&interact_ref=…&hash=…`; Chrome no sabe abrir `exp://`,
pero la URL queda en la barra de direcciones o en la consola de DevTools (F12):
"Failed to launch 'exp://…'". Copiar `interact_ref` y `hash` (el `hash` puede traer `%2B`/`%2F`:
decodificarlos a `+`/`/`).

**4. Finalizar:**

```bash
curl -s -X POST "$API/payments/<paymentId>/finish" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"interact_ref":"<interact_ref>","hash":"<hash>"}'
```

→ `"status": "completed"`. Verificar en la Test Wallet: sale en la de quien paga y llega a la otra.

**5. Consultar:**

```bash
curl -s "$API/payments/<paymentId>" -H "Authorization: Bearer $TOKEN"
```

```bash
curl -s "$API/payments" -H "Authorization: Bearer $TOKEN"
```

Si algo falla: CloudWatch logs de la Lambda (`Open Payments error …` trae status y descripción).
