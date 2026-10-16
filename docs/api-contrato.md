# Contrato front ↔ back (borrador)

Basado en `docs/ARQUITECTURA.md` (rama `david` del back, transcripción del draw.io página 3). Las rutas son **propuesta del front** hasta que Duvan y David las confirmen; cuando el back publique las suyas, se actualiza este archivo y `src/api/httpApi.ts`, nunca las pantallas.

Reglas comunes: `Authorization: Bearer <accessToken de Cognito>` en todo salvo signup y login. `author` / `paymentAuthor` los pone el back desde el `sub`. Montos `{ value: string, assetCode, assetScale }`. Errores `{ error, message }` con su status HTTP.

## Endpoints

| Flujo | Método y ruta | Body → respuesta | Pantallas |
|---|---|---|---|
| 1 | `POST /signup` | {username, password, email, phone, walletAddress} → {userId} | 02 |
| 2 | Cognito `InitiateAuth` (USER_PASSWORD_AUTH) | → {AccessToken, IdToken, RefreshToken} | 03 |
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
