# Coordinación front ↔ back (2026-10-16 ~16:00)

> **Actualización ~22:00 (rama `david` `dc3a428`, API probada por curl):**
> - **Pagos listos en AWS:** `POST /payments`, `GET /payments`, `GET /payments/{id}`, `POST /payments/{id}/finish` responden 401 sin token (existen y tienen autorizador) y `GET /payments/{id}/return` (opción B, pública) responde. Primer inicio de pago real verificado por David (`melos` COP → `f9a1abde` EUR).
> - **El front ya es compatible con la opción B:** la billetera vuelve a `return-payment`, que finaliza y redirige a `natillera://retorno?paymentId=…&result=ok|rejected|failed|pending`. La 30 llama `finish` sin `interact_ref`; como el pago ya no está `pending`, el back devuelve el estado (idempotente) y la 30 consulta hasta el final. `rejected` ya está en `WALLET_REJECTIONS`.
> - **Faltan `GET /me` y `GET /natilleras/mine`** (403). **El front las escribió:** rama [`front/natillera-mine`](https://github.com/HenryStark866/interterledger-natillera-sin-fronteras-backend/tree/front/natillera-mine) del fork de Henry (`c6ce48a`): Lambda `natilleras-mine` (solo DynamoDB, proxy), `GET /me` con `userId = username` (lo que usa `start-payment` en `integrants`), semilla `n-rosa` (prueba1 Doña Rosa admin, prueba2 Luz, prueba3 Andrés «debe»; fondo `f9a1abde` EUR, cuota 11,00 €) y `infra/deploy-natillera.sh`. Probadas con DynamoDB simulado; **David corre el script** (`AWS_PROFILE=natillera bash infra/deploy-natillera.sh`). Guía: `docs/API-NATILLERA.md` en esa rama.
> - **Luego, en el front (Camilo):** `EXPO_PUBLIC_REAL_METHODS=getMe,getMyNatillera,startPayment,finishPayment,getPayment` y `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id`. Entrar con `prueba3` y poner la cuota = camino del pitch con pago real.

> **Actualización ~17:15:** el PR del front ya está en `main` y la app tiene modo híbrido: cada función pasa a real cuando su ruta exista (`EXPO_PUBLIC_REAL_METHODS`). Para el pago real hacen falta, con estos nombres exactos, `POST /payments`, `POST /payments/{id}/finish` y `GET /payments/{id}` (hoy solo existe `/start-payment`). Si prefieren otros nombres, avisen: se cambian solo en `src/api/httpApi.ts`.
>
> **Actualización ~17:00 (rama `david` `4d38582`, API probada por curl):**
> - **Código de pagos listo:** `deploy/payments` con `start-payment`, `finish-payment` y `get-payment` cumple la §3 y la §5 (allowlist de `returnUrl`, `?paymentId=` en el `finish.uri`, dueño del pago, hash verificado, `result` ignorado, idempotente). Zips en `deploy/payments/dist`.
> - **API desplegada:** REST `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev`, autorizador Cognito, **IdToken** (en el front: `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id`, ya soportado).
> - **Pero solo existe `/start-payment`.** `/payments`, `/payments/{id}`, `/payments/{id}/finish`, `/me` y `/natilleras/mine` responden `403 Missing Authentication Token` (= la ruta no existe). Faltan las rutas, las tablas (`payments-history` con GSI `author-index`, `natillera-registration`) y el rol IAM.
> - **Identidad:** el back usa `username` en todo (`author`, `integrants`), pero `GET /me` devuelve `userId = sub`. Propuesta: `userId = username` en `/me` y en `members[].userId`, para que «¿A nombre de quién?» y el chequeo de integrante cuadren.
> - **`/me` con VTL:** `deploy/me` lee `requestContext.authorizer`; en el API REST debe ir con **integración proxy** (las de pagos pueden seguir en VTL).
> - **Errores en VTL:** si no se configuran las respuestas de integración por código, un error llega como **200** con `{"errorMessage":"[400] …"}` y la pantalla se cae. Es el paso más fácil de olvidar.
> - **Front:** en API REST una ruta inexistente responde 403, no 404: `previewQuote` debe tratar ese caso como «sin vista previa» (carril `base`).

> **Actualización ~16:45:**
> - **Contrato:** ya existe [openapi.yaml](openapi.yaml). El back lo citaba como fuente de verdad, pero no estaba en ninguna rama: tiene las 20 rutas y los esquemas exactos que usa la app; las P0 van marcadas.
> - **Avance del back:** Duvan subió `start-payment.ts` (`duvdev` `87d69a6`) y David ya le revisó los bloqueantes (`david` `cc46527`). Esa revisión coincide con la §5 de abajo.
> - **Tabla de usuarios:** ahora se llama `user-info`, con llave `source` (username) + `id` (1). `GET /me` sigue devolviendo la misma forma.
> - **Ruta:** el front llama `POST /payments`, no `/payments/start`.

De Henry (front) para Duvan y David, con copia a Camilo. Se revisó el repo del back (ramas `david` `f1fa755`, `duvdev` `fbd01d3`, `master` `63ef6a3`) y se probó Cognito real por terminal. Objetivo: que front y back lleguen juntos al pago real antes de las 11:00 del sábado.

## 1 · Estado verificado

| Pieza | Back | Front | Probado |
|---|---|---|---|
| Registro (SignUp + pre-signup) | ✅ desplegado, `us-east-2`, guarda en `Users-info` | ✅ `src/api/auth.ts` | ✅ 16:00 por terminal: usuario nuevo confirmado al instante |
| Login (InitiateAuth) | ✅ | ✅ | ✅ token de 1 h con refresh; claims `sub`, `username`, `client_id` |
| Rechazos del pre-signup | ✅ (motivos en inglés) | ✅ traducidos a «usted» (ver §4) | ✅ `Invalid wallet address` |
| `GET /me` | 🟡 Lambda escrita (`deploy/me`), API Gateway sin URL | ✅ (`displayName` = `username` si no viene) | ⬜ |
| Pagos (flujos 3 y 4) | ⬜ sin código | ✅ pantallas 11, 26–34 | ⬜ |
| Natillera (7, 8, 9, 13) | ⬜ | ✅ 05–10, 15 | ⬜ |
| Recurrente y préstamos (10–12B) | ⬜ | ✅ 12–14, 16–25 | ⬜ |
| Tablas DynamoDB | 🟡 al menos `Users-info` | — | — |

Usuario de prueba creado por el front en el pool: `pruebafront28396` (correo `@example.com`, billetera de Duvan). **David: se puede borrar.**

## 2 · Camino mínimo real para el pitch (P0)

Con el tiempo que queda, proponemos que la demo en vivo vaya en **modo demo** y que el **pago real** quede grabado en video (lo pide el checklist). Para ese video el back necesita solo esto, en este orden:

| # | Ruta | Para qué | Pantallas |
|---|---|---|---|
| 1 | URL de API Gateway (HTTP API + authorizer JWT de Cognito) | Sin ella la app no sale del modo demo | todas |
| 2 | `GET /me` | Saber quién entró (`userId` = `sub`) | 04, 11, 26 |
| 3 | `GET /natilleras/mine` | La 10 y la 11 la necesitan para mostrar la natillera y el botón de cuota. **Puede devolver una natillera fija** sembrada a mano en DynamoDB | 10, 11 |
| 4 | `POST /payments` (`kind: "aporte"`) | Flujo 3: incoming en la billetera del fondo + quote + grant interactivo → `redirectUrl` | 11, 28 |
| 5 | `POST /payments/{id}/finish` | Flujo 4: continue con `interact_ref` + outgoing payment | 30 |
| 6 | `GET /payments/{id}` | La 30 consulta hasta un estado final | 30–34 |

Lo demás (cuentas guardadas, crear o unirse a una natillera, recurrente, préstamos) queda en demo para el pitch. Si sobra tiempo, el siguiente es `POST /recurring` + `charge-now`.

## 3 · Formatos exactos que espera el front

Reglas: montos `{ value: string, assetCode, assetScale }` en unidades menores; `Authorization: Bearer <AccessToken>`; errores `{ error, message }` con su status (la app muestra su propio texto según el status, nunca el `message` crudo). Las rutas se pueden cambiar: el front las ajusta solo en `src/api/httpApi.ts`.

```jsonc
// GET /me → 200 (lo que ya devuelve deploy/me/index.mjs sirve tal cual)
{ "userId": "<sub>", "username": "rosa", "email": "…", "phone": "+57…",
  "walletAddress": "https://ilp.interledger-test.dev/…", "assetCode": "COP", "assetScale": 2 }

// GET /natilleras/mine → 200 (o null si no está en ninguna)
{ "natilleraId": "n1", "natilleraName": "Natillera Familia Rosa",
  "walletAddress": "https://ilp.interledger-test.dev/<fondo>", "asset": { "assetCode": "COP", "assetScale": 2 },
  "quota": { "value": "5000000", "assetCode": "COP", "assetScale": 2 },
  "invitationCode": "ROSA-4821", "joinUrl": "https://…", "isAdmin": true,
  "fundTotal": { "value": "15000000", "assetCode": "COP", "assetScale": 2 },
  "myTotal":   { "value": "15000000", "assetCode": "COP", "assetScale": 2 },
  "myStatus": "al-dia",                       // "al-dia" | "debe"
  "members": [ { "userId": "<sub>", "name": "Doña Rosa", "isAdmin": true,
                 "total": { "value": "15000000", "assetCode": "COP", "assetScale": 2 },
                 "status": "al-dia", "pendingCount": 0 } ],
  "lastRecords": [ { "id": "r1", "authorName": "Andrés", "paidByName": "Andrés",
                     "amount": { "value": "5000000", "assetCode": "COP", "assetScale": 2 },
                     "createdAt": "2026-10-16T15:00:00Z" } ] }

// POST /payments  ← body
{ "kind": "aporte", "natilleraId": "n1", "author": "<sub del socio, opcional>",
  "value": "5000000", "assetCode": "COP", "assetScale": 2,
  "returnUrl": "natillera://retorno" }          // ver §5
// → 201
{ "paymentId": "uuid", "redirectUrl": "https://<auth de la Test Wallet>/…",
  "debitAmount": { … }, "receiveAmount": { … } } // los dos montos son opcionales pero muy útiles en la 28

// POST /payments/{id}/finish  ← body
{ "interact_ref": "…", "hash": "…" }            // la app también manda "result": ignórenlo
// → 200 y GET /payments/{id} → 200
{ "paymentId": "uuid", "kind": "aporte", "status": "completed",  // pending | completed | rejected | failed
  "counterpartName": "Natillera Familia Rosa",
  "debitAmount": { … }, "receiveAmount": { … }, "createdAt": "…" }
```

Nombres: donde `ARQUITECTURA.md` dice otra cosa (`joinNatilleraUrl`, `natilleraInvitation`, `natilleraID`), usen los de arriba o avísennos y el front los mapea en `httpApi.ts`. Lo que no puede faltar: los montos completos (si llega `undefined`, la pantalla se cae).

Importante: `members[].userId` debe ser el **mismo `sub`** que devuelve `GET /me` en `userId` (la 11 los compara para armar «¿A nombre de quién?»).

## 4 · Lo que ya ajustó el front a lo que ustedes desplegaron

- **Billetera en el registro:** el pre-signup solo acepta `https://ilp.interledger-test.dev/…` o el id. Si la persona escribía `$ilp.interledger-test.dev/…`, el registro fallaba con `Invalid wallet address` (probado). Desde hoy la app la convierte a URL https antes de mandarla.
- **Motivos en inglés:** Cognito devuelve `PreSignUp failed with error Invalid wallet address.` (sin «:»). Antes la app mostraba esa frase completa. Ahora traduce los 5 motivos del pre-signup («No encontramos esa billetera…», «Ese correo ya tiene una cuenta.», etc.). **Si cambian el texto de un `throw new Error(...)`, avísennos** o queda el mensaje genérico.
- **`GET /me` sin `displayName`:** la app usa el `username`.

## 5 · Lo que necesitamos que el back decida o haga

| # | Pedido | Por qué |
|---|---|---|
| 1 | **`returnUrl` con lista exacta:** aceptar `natillera://retorno` (APK) y `exp://<IP>:8081/--/retorno` (Expo Go, la IP cambia por red). Rechazar cualquier otra | Es el `finish.uri` del grant; sin lista exacta, un tercero podría recibir el `interact_ref` |
| 2 | Agregar `?paymentId=<id>` al `finish.uri` | La app lee `paymentId`, `interact_ref` y `hash` de la URL de vuelta |
| 3 | Validar que el `paymentId` sea del `sub` del token, e **ignorar el `result`** del cliente | Seguridad: el estado lo decide Open Payments, no la app |
| 4 | `GET /payments/{id}` | La 30 consulta hasta un estado final |
| 5 | Verificar si la Test Wallet acepta `natillera://` como `finish.uri`. Si no, opción B: `finish.uri` https del back, que verifique el `hash`, finalice y responda 302 a `natillera://retorno?paymentId=…&result=…` | El front ya soporta las dos opciones |
| 6 | Unificar `natilleraId` / `natilleraID` | El front usa `natilleraId` |
| 7 | Rama `main` en el repo back (hoy `master`), `AI_USAGE.md` y `/prompts` en la raíz | Reglas de la hackatón; ya tienen `AI_USAGE.md` en la rama `david` |
| 8 | Avisar la URL de API Gateway en cuanto exista | Camilo la pone en `.env` y en `eas.json` para el APK |

## 6 · En qué los ayudamos desde el front

1. **Lambdas sin Open Payments:** podemos escribir `GET /natilleras/mine`, `POST /natilleras`, `POST /natilleras/join` y `GET /payments/{id}`, que solo leen y escriben DynamoDB, siguiendo el patrón de `deploy/me/index.mjs` (Node 22, `index.mjs`, claims del authorizer). Así Duvan se concentra en la capa Open Payments (flujos 3 y 4) y David solo las pega en la consola. Díganos qué tablas y llaves quedan.
2. **Datos semilla:** el JSON de la natillera de Doña Rosa (Rosa, Luz, Andrés) que usa el modo demo, listo para cargar en `natillera-registration` y `natillera-records`.
3. **Probar sus rutas por terminal** (curl con un token de un usuario de prueba) en cuanto haya URL, y avisar qué no cuadra con §3.
4. **Test Wallet:** Henry arma las direcciones de Doña Rosa, Luz y el fondo (idealmente COP, USD y EUR) y se las pasa. Las direcciones son públicas; las llaves no salen nunca de Secrets Manager.

## 7 · APK

`eas.json` ya tiene el perfil `preview` (APK). Quien tenga cuenta de Expo (Camilo): `npx eas-cli build -p android --profile preview`. Antes, poner `EXPO_PUBLIC_API_URL` en el bloque `env` del perfil: `.env` no se sube al build porque está en `.gitignore`. Sin URL, el APK arranca en modo demo, que es lo que se muestra en vivo.
