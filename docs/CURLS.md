# Curls para probar el backend

Todos los requests en un solo lugar, listos para copiar en **Git Bash** o **CloudShell**.
Explicación del API: [API.md](API.md). Prueba guiada automática: `bash scripts/probar-pago.sh`.

> Estado de las rutas al 2026-10-16: `POST /start-payment` responde (401 sin token). Las rutas del
> contrato (`/payments`, `/payments/{id}`, `/payments/{id}/finish`) todavía **no están implementadas
> en el stage `dev`** (responden 403 "Missing Authentication Token"). Mientras tanto, para iniciar
> se puede usar `/start-payment` (ver 3b).

## 0 · Variables

```bash
API=https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev
```

```bash
CLIENT_ID=20b10a2tnnr69lqlp2sf62orv0
```

## 1 · Crear cuenta (Cognito SignUp)

La wallet tiene que existir en la Test Wallet. Responde `{"UserConfirmed": true, "UserSub": "…"}`.

```bash
curl -s https://cognito-idp.us-east-2.amazonaws.com/ -H 'Content-Type: application/x-amz-json-1.1' -H 'X-Amz-Target: AWSCognitoIdentityProviderService.SignUp' -d '{"ClientId":"'"$CLIENT_ID"'","Username":"<usuario>","Password":"<Clave#2026>","UserAttributes":[{"Name":"email","Value":"<correo@ejemplo.com>"},{"Name":"phone_number","Value":"+57<numero>"},{"Name":"custom:walletId","Value":"https://ilp.interledger-test.dev/<wallet>"}]}'
```

## 2 · Iniciar sesión (Cognito InitiateAuth)

```bash
curl -s https://cognito-idp.us-east-2.amazonaws.com/ -H 'Content-Type: application/x-amz-json-1.1' -H 'X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth' -d '{"ClientId":"'"$CLIENT_ID"'","AuthFlow":"USER_PASSWORD_AUTH","AuthParameters":{"USERNAME":"<usuario>","PASSWORD":"<clave>"}}'
```

Copiar **`AuthenticationResult.IdToken`** (el API es REST con autorizador Cognito: va el IdToken,
no el AccessToken). No pegar tokens en chats ni en el repo.

```bash
TOKEN=<IdToken>
```

Renovar cuando vence (1 h):

```bash
curl -s https://cognito-idp.us-east-2.amazonaws.com/ -H 'Content-Type: application/x-amz-json-1.1' -H 'X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth' -d '{"ClientId":"'"$CLIENT_ID"'","AuthFlow":"REFRESH_TOKEN_AUTH","AuthParameters":{"REFRESH_TOKEN":"<RefreshToken>"}}'
```

## 3 · Iniciar pago — `POST /payments`

Paga la wallet del usuario logueado; recibe `walletAddress` (debe ser otra wallet). Monto en
unidades menores (`"100"` = 1,00) en la moneda de quien paga **o** de quien recibe.

```bash
curl -s -X POST "$API/payments" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"kind":"p2p","walletAddress":"https://ilp.interledger-test.dev/<wallet-que-recibe>","value":"100","assetCode":"EUR","assetScale":2,"returnUrl":"exp://localhost:8081/--/retorno"}'
```

Respuesta: `{ "paymentId", "redirectUrl", "debitAmount", "receiveAmount" }`.

```bash
PAYMENT_ID=<paymentId>
```

### 3b · Mientras `/payments` no esté implementada

```bash
curl -s -X POST "$API/start-payment" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"kind":"p2p","walletAddress":"https://ilp.interledger-test.dev/<wallet-que-recibe>","value":"100","assetCode":"EUR","assetScale":2,"returnUrl":"exp://localhost:8081/--/retorno"}'
```

## 4 · Aprobar en la billetera (navegador)

1. Abrir `redirectUrl` en Chrome con la sesión de la Test Wallet de **quien paga** → **Aceptar**.
2. La billetera intenta abrir
   `exp://localhost:8081/--/retorno?paymentId=…&interact_ref=…&hash=…`. Chrome no puede abrirla:
   copiar la URL de la barra o de la consola (F12, "Failed to launch 'exp://…'").
3. Sacar `interact_ref` y `hash`. Si el `hash` trae `%2B`, `%2F` o `%3D`, cambiarlos por `+`, `/` y `=`.

```bash
INTERACT_REF=<interact_ref>
```

```bash
HASH=<hash>
```

## 5 · Finalizar pago — `POST /payments/{id}/finish`

```bash
curl -s -X POST "$API/payments/$PAYMENT_ID/finish" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"interact_ref":"'"$INTERACT_REF"'","hash":"'"$HASH"'"}'
```

Respuesta: el pago con `"status": "completed"` (o `rejected` si se rechazó, `failed` si falló).
Repetirlo devuelve el mismo estado sin pagar de nuevo.

## 6 · Consultar un pago — `GET /payments/{id}`

```bash
curl -s "$API/payments/$PAYMENT_ID" -H "Authorization: Bearer $TOKEN"
```

## 7 · Historial — `GET /payments`

```bash
curl -s "$API/payments" -H "Authorization: Bearer $TOKEN"
```

## 8 · Pruebas negativas

Sin token → **401** `{"message":"Unauthorized"}`:

```bash
curl -s -i -X POST "$API/payments" -H 'Content-Type: application/json' -d '{}'
```

`returnUrl` no permitido → **400** `InvalidReturnUrl`:

```bash
curl -s -i -X POST "$API/payments" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"kind":"p2p","walletAddress":"https://ilp.interledger-test.dev/x","value":"100","assetCode":"EUR","assetScale":2,"returnUrl":"https://evil.com"}'
```

Wallet de otro host → **400** `InvalidWalletAddress`:

```bash
curl -s -i -X POST "$API/payments" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"kind":"p2p","walletAddress":"https://evil.com/x","value":"100","assetCode":"EUR","assetScale":2,"returnUrl":"natillera://retorno"}'
```

Monto inválido → **400** `InvalidAmount`:

```bash
curl -s -i -X POST "$API/payments" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"kind":"p2p","walletAddress":"https://ilp.interledger-test.dev/x","value":"1.5","assetCode":"EUR","assetScale":2,"returnUrl":"natillera://retorno"}'
```

Pago que no existe o de otra persona → **404** `PaymentNotFound`:

```bash
curl -s -i "$API/payments/no-existe" -H "Authorization: Bearer $TOKEN"
```

Si un error llega como **200** con `{"errorMessage":"[400] …"}`, faltan las *respuestas de
integración* del método ([API-PAGOS.md](API-PAGOS.md#respuestas-de-error-sin-proxy)).
