# Open Payments — lo que el equipo necesita saber

Investigación del 2026-10-16. Fuentes: https://openpayments.dev/es/ · https://github.com/interledger/open-payments-node (el SDK ya no vive en `interledger/open-payments`) · https://github.com/interledger/open-payments-snippets · config de Rafiki. Lo marcado "por verificar" no está confirmado en fuentes oficiales.

## Regla de oro

**Toda llamada firmada sale del backend (Lambda, Node 22/24).** El SDK `@interledger/open-payments` (v7.4.0) solo corre en Node: usa `crypto` y `fs` (issue open-payments-node#4). La app React Native nunca tiene la llave privada: llama a nuestra API y abre la URL de consentimiento de la billetera. La llave vive en AWS Secrets Manager y se pasa al SDK como PEM (no como ruta de archivo).

## Conceptos

| Concepto | Qué es |
|---|---|
| Wallet address | URL https pública de una cuenta. `GET` devuelve `id`, `assetCode`, `assetScale`, `authServer`, `resourceServer`. Llaves públicas en `{wa}/jwks.json` |
| Resource server | Expone `incoming-payments`, `quotes`, `outgoing-payments`. Cada llamada: access token + firma HTTP |
| Authorization server | GNAP (RFC 9635). Sin `client_id`: el cliente se identifica con su wallet address + JWKS |
| Incoming payment | Se crea en la cuenta del receptor. Con `incomingAmount` se completa solo; sin él hay que `complete` a mano |
| Quote | En la cuenta del emisor sobre el `receiver`. Devuelve `debitAmount` y `receiveAmount`. Expira en ~5 min (Rafiki) |
| Outgoing payment | Orden de pago del emisor. Siempre requiere grant **interactivo** |
| Grants | `incoming-payment` y `quote`: no interactivos. `outgoing-payment`: interactivo (el usuario aprueba en su billetera) |
| Access token | Ligado a la llave del cliente, expira en ~10 min (Rafiki). `token.rotate` con la URL `manage` |
| Montos | `{ value: "10000", assetCode: "USD", assetScale: 2 }` = 100,00 USD. `value` es string entero; nunca floats |

## Flujo estándar (= flujos 3 y 4 del diagrama del back)

1. `client.walletAddress.get` de emisor y receptor.
2. Grant no interactivo `incoming-payment` en el AS del receptor → `incomingPayment.create`.
3. Grant no interactivo `quote` en el AS del emisor → `quote.create({ method: "ilp", walletAddress, receiver })`.
4. Grant **interactivo** `outgoing-payment` con `limits.debitAmount = quote.debitAmount` e `interact.finish = { method: "redirect", uri, nonce }`. Guardar nonce, `interact.finish`, `continue.uri` y `continue.access_token`. La app abre `interact.redirect`.
5. La billetera redirige a `finish.uri?hash=…&interact_ref=…`. Verificar: `base64(sha256(clientNonce\ninteractNonce\ninteractRef\nauthServerUrl))` (si no cuadra, probar sin padding).
6. `grant.continue({ interact_ref })` → `outgoingPayment.create({ walletAddress, quoteId })`.

Usar `isFinalizedGrantWithAccessToken` (el viejo `isFinalizedGrant` está deprecado). Errores: `OpenPaymentsClientError` con `status`, `code`, `description`.

## Cuota automática y cuotas del préstamo (flujos 12 y 12B)

- Grant interactivo con `limits: { interval: "R12/2026-10-17T00:00:00Z/P1M", debitAmount: {...} }`. `debitAmount` es el tope **por intervalo**; se reinicia y no se acumula. Usar `debitAmount` **o** `receiveAmount`, nunca ambos.
- El usuario aprueba una vez; en cada periodo el back rota el token, crea incoming payment en el fondo y outgoing payment (puede ir sin quote: `incomingPayment` + `debitAmount`).
- `outgoingPayment.getGrantSpentAmounts` da lo gastado en el intervalo actual.
- Para la demo: EventBridge con P1M no corre en 5 min → endpoint `charge-now`.

## Entre monedas

Basta con que las dos wallets tengan `assetCode` distinto: la quote trae `debitAmount` en la moneda del emisor y `receiveAmount` en la del receptor. La tasa la pone el proveedor.

## La billetera desde el móvil

1. App → `POST /payments` → back devuelve `redirectUrl`.
2. App: `WebBrowser.openAuthSessionAsync(redirectUrl, "natillera://retorno")`.
3. Recomendado: `finish.uri` es https del back; el back verifica el hash, finaliza y responde 302 a `natillera://retorno?paymentId=…&result=…`. Así el hash no pasa por el móvil.
4. App consulta `GET /payments/{id}` hasta `completed | rejected | failed`.

Por verificar: si la Test Wallet acepta esquemas no-https como `finish.uri`, y si al rechazar redirige con `result=grant_rejected`.

## Test Wallet (https://wallet.interledger-test.dev)

Crear cuenta → confirmar correo → KYC (datos ficticios salvo el correo) → New account (moneda) → Deposit (dinero de juego) → Add wallet address. Llaves: Settings → Developer Keys → "Generate public & private key" (descarga `private.key` y muestra el key ID). **El `private.key` va directo a Secrets Manager / `secrets/`, nunca a git ni a un prompt.** Por verificar en la UI: si hay COP.

## Trampas

- Quotes de ~5 min y tokens de ~10 min: ir a la billetera enseguida; rotar tokens antes de cada cobro programado.
- El hash usa la URI exacta del AS.
- El `url` de las llamadas al RS es `walletAddress.resourceServer`.
- No hay webhooks para clientes (son del operador de Rafiki): el estado se consulta con `incomingPayment.get` / `outgoingPayment.get`.
- Open Payments no expone saldos: fondo = aportes − préstamos (lo calcula el back).

## Recursos

- Ejemplo P2P completo: https://github.com/interledger/open-payments-node/tree/main/examples/peer-to-peer
- Guías recurrentes: https://openpayments.dev/guides/recurring-remittance-fixed-debit/ · https://openpayments.dev/guides/outgoing-grant-future-payments/
- Curso Platzi (obligatorio uno de los dos): https://platzi.com/cursos/interledger-openpayments/
