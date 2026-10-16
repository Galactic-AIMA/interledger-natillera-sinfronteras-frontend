# Contrato front ↔ back (borrador)

Basado en `docs/ARQUITECTURA.md` (rama `david` del back, transcripción del draw.io página 3). Las rutas son **propuesta del front** hasta que Duvan y David las confirmen; cuando el back publique las suyas, se actualiza este archivo y `src/api/httpApi.ts`, nunca las pantallas.

> **Fuente de verdad (decisión de Camilo, 2026-10-16):** `docs/openapi.yaml` en el repo back; este archivo es el resumen del front. Si difieren, manda el OpenAPI. El proceso conjunto está en `docs/INTEGRACION.md` del back (rama `docs/integracion-front`, por subir). Hasta que el back apruebe el borrador, nada es definitivo. Mientras tanto el front trabaja solo con mocks hasta la madrugada.

Reglas comunes: `Authorization: Bearer <accessToken de Cognito>` en todo salvo signup y login. `author` / `paymentAuthor` los pone el back desde el `sub`. Montos `{ value: string, assetCode, assetScale }`. Errores `{ error, message }` con su status HTTP.

## Endpoints

| Flujo | Método y ruta | Body → respuesta | Pantallas |
|---|---|---|---|
| 1 | Cognito `SignUp` directo (no pasa por nuestra API) | {ClientId, Username, Password, UserAttributes: email, phone_number (+57…), custom:walletId} → {UserConfirmed: true, UserSub} | 02 |
| 2 | Cognito `InitiateAuth` (USER_PASSWORD_AUTH; renovar con REFRESH_TOKEN_AUTH) | → {AccessToken, RefreshToken, ExpiresIn: 3600} | 03 |
| 13 | `GET /me` | → {username, email, phone, walletAddress, assetCode, assetScale} | 04, 26 |
| — | `GET /wallets/verify?url=` | → {exists, assetCode, assetScale} | 02, 08, 27 |
| 3 | `POST /payments` | {kind: "p2p"\|"aporte", customWalletName? \| natilleraId?, author?, value, assetCode, assetScale} → {paymentId, redirectUrl, debitAmount?, receiveAmount?} | 11, 26, 28 |
| 4 | `POST /payments/{id}/finish` | {interact_ref, hash?} → {status, debitAmount, receiveAmount} | 30 |
| 4 | `GET /payments/{id}` | → {paymentId, kind, status: pending\|completed\|rejected\|failed, debitAmount, receiveAmount} | 30–34 |
| 13 | `GET /payments` | → lista (historial "Sus pagos") | 26 |
| 5 | `POST /accounts` | {walletAddress, customWalletName} → {customWalletName, assetCode, assetScale} | 27 |
| 13 | `GET /accounts` | → lista de cuentas guardadas | 26 |
| 7 | `POST /natilleras` | {natilleraName, walletAddress} → {natilleraId, natilleraName, joinNatilleraUrl, natilleraInvitation} | 08, 09 |
| 8 | `GET /invitations/{code}` | → {natilleraName, adminName, cuota?} (vista previa) | 06 |
| 8 | `POST /natilleras/join` | {natilleraInvitation} → {natilleraId} | 06, 07 |
| 13 | `GET /natilleras/mine` | → {natilleraId, natilleraName, isAdmin, asset, fundTotal, myTotal, myStatus, members[{name, total, status}], lastRecords[]} \| null | 05, 10, 15 |
| 12 | `POST /recurring` | {natilleraId, author?, value, assetCode, assetScale} → {grantId, redirectUrl, limit, repetitions} | 12 |
| 12 | `POST /recurring/{grantId}/finish` | {interact_ref} → {status: active} | 14 |
| 12 | `POST /recurring/{grantId}/charge-now` | (demo) → {paymentId} | demo |
| 10 | `GET /loans/simulate?value=&installments=` | → {receiveAmount, schedule[]} | 16, 24 |
| 10 | `POST /loans/requests` | {natilleraId, value, assetCode, assetScale, installments} → {requestId} | 16 |
| 12B | `POST /loans/requests/{id}/repayment-grant` | → {grantId, redirectUrl, limitPerInstallment, repetitions} | 17 |
| 12B | `POST /loans/repayment/{grantId}/finish` | {interact_ref} → {status} | 19 |
| 11 | `GET /loans/requests?status=pending` | (admin) → lista | 21 |
| 11 | `POST /loans/requests/{id}/decision` | {accepted} → {paymentId?, redirectUrl?} | 21, 22, 23, 25 |
| 13 | `GET /loans/mine` | → {request, loan?, schedule[{n, capital, interest, total, status: pagada\|pendiente\|en mora}], balance} | 20, 24, 25 |

## Regreso de la billetera

Opción A (diagrama actual del back): `finish.uri = natillera://retorno?paymentId=…`; la billetera agrega `interact_ref` y `hash`; la app llama `POST /payments/{id}/finish`.

Opción B (recomendada por el front): `finish.uri` https del back, que verifica el hash, finaliza y responde 302 a `natillera://retorno?paymentId=…&result=ok|rejected|failed`; la app solo consulta `GET /payments/{id}`.

Por verificar con la Test Wallet: si acepta `natillera://` como `finish.uri` (si no, la opción B es obligatoria).

## Agregados del front al implementar `httpApi` (propuesta, 2026-10-16)

- **`returnUrl`** en `POST /payments`, `POST /recurring`, `POST /loans/requests/{id}/repayment-grant` y `POST /loans/requests/{id}/decision`: la app manda a dónde debe volver la persona (`natillera://retorno` en el APK, otra URL en Expo Go). El back la usa como `finish.uri` (opción A) o como destino del 302 (opción B).
- **`POST /payments/preview`** (opcional): mismo body que `POST /payments`, devuelve `{debitAmount, receiveAmount, fee?}` sin crear grant. Si responde 404, la app muestra "se calcula al confirmar" y sigue.
- **Token**: la app manda el `AccessToken` de Cognito; si el authorizer de API Gateway espera el `IdToken`, se cambia con `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id` sin tocar código.

## Auth con Cognito (confirmado por el back, 2026-10-16)

- Registro y login: `POST https://cognito-idp.us-east-2.amazonaws.com/`, sin token ni API key. Headers `Content-Type: application/x-amz-json-1.1` y `X-Amz-Target: AWSCognitoIdentityProviderService.SignUp` o `.InitiateAuth`. `ClientId` `20b10a2tnnr69lqlp2sf62orv0` (App Client público, sin secreto).
- SignUp confirma la cuenta al instante; la app entra sola con `InitiateAuth` después.
- `AccessToken` en `Authorization: Bearer <AccessToken>`; dura 1 h y se renueva con `REFRESH_TOKEN_AUTH`. Tokens en `expo-secure-store`.
- Errores (400, `__type` + `message`): `UserLambdaValidationException` (se muestra el motivo del back), `UsernameExistsException`, `InvalidPasswordException`, `InvalidParameterException`, `NotAuthorizedException`.
- Detalle: `docs/API-AUTH.md` de la rama `david` del back. Implementación: `src/api/auth.ts`.
