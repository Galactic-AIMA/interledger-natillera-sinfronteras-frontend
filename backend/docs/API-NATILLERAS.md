# API — bloque A: perfil, billeteras, cuentas guardadas y natilleras

Flujos 5, 7, 8 y 13 de [ARQUITECTURA.md](ARQUITECTURA.md). Rama `feat/natilleras` (sale de `david`).
Código en `deploy/natilleras/src/` (un handler por endpoint, lógica en `domain.ts`); despliegue con
`infra/deploy-natilleras.sh`. No usa el SDK de Open Payments ni Secrets Manager: solo lee la dirección
pública de cada billetera (GET sin llaves), con allowlist de hosts (`ilp.interledger-test.dev`).

Mismo montaje que pagos: API REST `lofoyfhz52`, stage `dev`, `cognito_authorizer` (IdToken),
integración **VTL** (`INTEGRATION_MODE=vtl`), errores `[status] {json}` mapeados al status real.

## Endpoints

Todos con `Authorization: Bearer <IdToken>`. El usuario sale de `cognito:username` del token.

| Método y ruta | Lambda | Body / query | Respuesta 200 |
|---|---|---|---|
| `GET /me` | `get-me` | — | `{ userId, username, displayName, email, phone, walletAddress, assetCode, assetScale }` |
| `GET /wallets/verify?url=` | `verify-wallet` | `url`: URL, `$ilp…` o id | `{ exists, walletAddress, assetCode?, assetScale? }` |
| `POST /accounts` | `save-account` | `{ walletAddress, customWalletName }` | `{ customWalletName, walletAddress, assetCode, assetScale }` |
| `GET /accounts` | `list-accounts` | — | lista de cuentas guardadas |
| `POST /natilleras` | `create-natillera` | `{ natilleraName, walletAddress, quota? }` | Natillera (vista) |
| `GET /natilleras` | `list-natilleras` | — | `[{ natilleraId, natilleraName, isAdmin, membersCount, asset, quota }]`, la más antigua primero |
| `GET /natilleras/mine[?natilleraId=]` | `get-my-natillera` | `natilleraId` opcional | Natillera (vista): la pedida, o sin id la más antigua; `null` si no tiene |
| `GET /invitations/{code}` | `get-invitation` | — | `{ code, natilleraName, adminName, quota }` |
| `POST /natilleras/join` | `join-natillera` | `{ natilleraInvitation }` | Natillera (vista) |

**Natillera (vista)**, igual al tipo `Natillera` del front (`src/api/types.ts`):

```json
{ "natilleraId": "uuid", "natilleraName": "Familia Pérez", "walletAddress": "https://ilp.interledger-test.dev/fondo",
  "asset": { "assetCode": "COP", "assetScale": 2 }, "quota": { "value": "5000000", "assetCode": "COP", "assetScale": 2 },
  "invitationCode": "FAMILIA-7K3M-Q9TD", "joinUrl": "natillera://unirse/FAMILIA-7K3M-Q9TD", "isAdmin": true,
  "fundTotal": { … }, "myTotal": { … }, "myStatus": "al-dia | debe",
  "members": [{ "userId": "rosa", "name": "rosa", "isAdmin": true, "total": { … }, "status": "al-dia", "pendingCount": 0 }],
  "lastRecords": [{ "id": "1760650000000", "authorName": "rosa", "paidByName": "luz", "amount": { … }, "createdAt": "…" }] }
```

## Reglas

| Tema | Regla |
|---|---|
| Varias natilleras por persona | Desde 2026-10-16 noche se puede crear o unirse a varias (ya no hay `409`). Unirse dos veces a la misma es idempotente y devuelve esa natillera. `mine` con un `natilleraId` ajeno → `404 NatilleraNotFound` |
| ADMIN | Quien crea (`author`). `userId` de los socios = username (es lo que guarda `integrants` y lo que valida `start-payment`) |
| Código de invitación | Primera palabra del nombre + 4 dígitos (`FAMILIA-7K3M-Q9TD`), único; se busca sin importar mayúsculas |
| Cuota | Opcional en el body (`quota.value`); siempre en la moneda del fondo. Por defecto 50.000 COP (u otras monedas: 20,00) |
| Total del fondo | Suma de `natillera-records` en la moneda del fondo − `disbursedTotal` de la natillera (lo suma el carril de préstamos) |
| Al día / debe | "Al día" si tiene al menos un aporte en el mes calendario actual (hora Colombia); si no, "debe" 1 cuota |
| Buscar mis natilleras | Scan con `contains(integrants, username)`: suficiente para la demo |
| Front | Sin selector, la app ve siempre la más antigua: tras crear una segunda debe pedir `mine?natilleraId=` con la nueva |

**Errores**: `400 BadRequest | InvalidWalletAddress | InvalidAmount`, `401 Unauthorized`, `404 UserNotFound |
InvitationNotFound | NatilleraNotFound`, `502 WalletLookupFailed`, `500 InternalError`.

## Tablas

| Tabla | PK | SK | Índice | Quién escribe |
|---|---|---|---|---|
| `saved-accounts` | `author` (S) | `customWalletName` (S) | — | `save-account` |
| `natillera-registration` | `natilleraId` (S) | — | `invitation-index` (PK `natilleraInvitation`, KEYS_ONLY) | `create-natillera`, `join-natillera`; préstamos suma `disbursedTotal` |
| `natillera-records` | `natilleraId` (S) | `id` (N) | — | `complete.ts` de pagos al quedar `completed` un aporte |

`natilleraId` va con **d minúscula** en todas (así lo escribe `complete.ts`).

## Desplegar (Ciro)

```bash
cd deploy/natilleras && npm install && npm test && npm run build && cd ../..
AWS_PROFILE=natillera bash infra/deploy-natilleras.sh
```

El script crea las tablas que falten (si existen con otras llaves, se detiene), el índice, una política
inline `natilleras-dynamo` en el rol de `start-payment`, las 9 Lambdas, las rutas y el deployment del stage.

**Pendiente en pagos para que el fondo sume:** `finish-payment` y `return-payment` necesitan
`NATILLERA_RECORDS_TABLE=natillera-records` en su entorno (hoy `deploy-payments.sh` no la pone y
`complete.ts` no registra el aporte si falta).

## Probar

```bash
API=https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev
curl -s "$API/natilleras/mine" -H "Authorization: Bearer $ID_TOKEN"
curl -s -X POST "$API/natilleras" -H "Authorization: Bearer $ID_TOKEN" -H 'Content-Type: application/json' \
  -d '{"natilleraName":"Familia Pérez","walletAddress":"https://ilp.interledger-test.dev/<fondo>"}'
curl -s "$API/invitations/FAMILIA-7K3M-Q9TD" -H "Authorization: Bearer $ID_TOKEN_2"
curl -s -X POST "$API/natilleras/join" -H "Authorization: Bearer $ID_TOKEN_2" -H 'Content-Type: application/json' \
  -d '{"natilleraInvitation":"FAMILIA-7K3M-Q9TD"}'
```

Pruebas locales sin AWS (DynamoDB en memoria, fetch falso): `npm test` en `deploy/natilleras` (6 casos).
