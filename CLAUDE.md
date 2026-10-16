# CLAUDE.md — Natillera sin Fronteras (backend)

Instrucciones para cualquier sesión de Claude Code que trabaje en este repo. Léelas completas
antes de tocar código, y lee después [MEMORY.md](MEMORY.md) (estado compartido entre sesiones).

## Qué es

Backend de **Natillera sin Fronteras**, proyecto de hackathon de Interledger. Una *natillera*
es un fondo de ahorro colectivo: los socios aportan periódicamente a una billetera común y el
fondo presta a sus integrantes. Los pagos se hacen con **Open Payments** (Interledger).

- Frontend: app nativa en **React Native** (otro repo; aquí solo backend).
- Backend: **AWS** — API Gateway + Lambda, Cognito, DynamoDB, Secrets Manager, EventBridge Scheduler.
- Pagos: SDK `@interledger/open-payments` (ver `app/package.json`).
- Equipo backend: Duvan Jaramillo (dueño del repo) y David Ciro.
- Repo: https://github.com/duvanjaramillomarin/interterledger-natillera-sin-fronteras-backend

## Documentos de referencia

| Documento | Para qué |
|---|---|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Los 13 flujos, tablas DynamoDB y reglas. Transcrito de la página 3 del draw.io (versión final). **Fuente de verdad del diseño.** |
| [AI_USAGE.md](AI_USAGE.md) | Bitácora obligatoria del uso de IA (entregable de la hackathon). |
| [docs/AWS-SETUP.md](docs/AWS-SETUP.md) | Guía de montaje de la infra AWS (manual) y estado de cada recurso. |
| [MEMORY.md](MEMORY.md) | Estado vivo: carriles, quién hace qué, decisiones, bloqueos. |
| Open Payments (es) | https://openpayments.dev/es/ — SDK en `/es/sdk/...`, guías en `/es/guides/...` |
| Repo Open Payments | https://github.com/interledger/open-payments |
| Diagrama original | draw.io en Google Drive "Arquitectura Natilleta sin fronteras.drawio", página 3 |

Guías de Open Payments más relevantes para nuestros flujos:
- Pago único (flujos 3/4): `/es/guides/onetime-remittance-fixed-debit`
- Recurrente (flujos 12/12B): `/es/guides/recurring-remittance-fixed-debit/` y `/es/guides/outgoing-grant-future-payments/`
- SDK: `/es/sdk/before-you-begin`, `/es/sdk/grant-continue`, `/es/sdk/token-rotate/`

## Reglas no negociables (de la arquitectura)

1. `author` y `paymentAuthor` salen del token de Cognito (claim `sub`). **Nunca del body.**
2. `assetCode` y `assetScale` se leen con GET a la wallet address; no se confía en el cliente.
3. Un usuario = una sola `walletAddress` (URL https).
4. Todo pago son dos llamadas: **iniciar** (flujo 3) → la persona aprueba en su billetera →
   **finalizar** con `interact_ref` (flujo 4). No hay atajos.
5. Open Payments no crea billeteras: la del fondo se crea a mano en la Test Wallet.
6. Montos siempre como **string en unidades menores** + `assetCode` + `assetScale`. Nunca floats.
7. Open Payments no expone saldos: total del fondo = aportes − préstamos desembolsados.
8. La llave privada del cliente de Open Payments vive en **Secrets Manager**. Nunca en el repo,
   en `.env` commiteado, ni en logs.

## Trabajo en paralelo (varias sesiones de Claude a la vez)

- **Modelo de ramas:**
  - `master` — integración final; solo entra por PR.
  - `duvdev` — rama de Duvan (la crea y la maneja él). No tocarla.
  - `docs` — rama de Camilo con la info de conexión con el frontend. No tocarla.
  - `david` — rama de David y sus sesiones de Claude. Lo que nos toca se sube aquí y de aquí
    sale el PR a `master`.
  - Sesiones paralelas de David: cada una en su worktree con una rama corta salida de `david`
    (`feat/<carril>-<tema>`, ej. `feat/pagos-start-payment`; también `fix/`, `docs/`, `chore/`),
    que se mergea de vuelta a `david`. (No usar `david/...`: choca con la rama `david` en git.)
- **Una sesión = un carril = una rama/worktree.** Los carriles están en MEMORY.md. Antes de
  empezar, reclama tu carril ahí (nombre de sesión + fecha). No trabajes en un carril reclamado.
- **Archivos compartidos** (cliente Open Payments, tipos, utilidades de montos, definición de
  tablas/infra): solo los toca el carril dueño indicado en MEMORY.md. Si otro carril necesita un
  cambio, lo anota en "Pedidos entre carriles" de MEMORY.md en vez de editarlo.
- Si cambias una interfaz compartida (contrato de un endpoint, esquema de una tabla), actualiza
  `docs/ARQUITECTURA.md` en el mismo PR.
- MEMORY.md: cada carril edita **solo su propia sección** y agrega líneas (no reescribe las de
  otros) para minimizar conflictos de merge.
- Antes de cerrar la sesión: actualizar tu sección de MEMORY.md y añadir la entrada en
  AI_USAGE.md.

## Documentar el uso de IA (obligatorio)

Entregables de la hackathon: `AI_USAGE.md` (raíz) y la carpeta `prompts/` con los prompts
relevantes usados (un `.md` por tema/sesión).

Cada sesión que produzca código, docs o decisiones con ayuda de IA agrega una entrada a
[AI_USAGE.md](AI_USAGE.md) con: fecha, persona, herramienta/modelo, carril, qué se pidió,
qué produjo la IA, qué se revisó/corrigió a mano. Los commits hechos con IA llevan la línea
`Co-Authored-By` correspondiente.

## Convenciones de código

- **TypeScript** en las Lambdas (runtime Node.js 22.x), un handler por endpoint, lógica de Open
  Payments solo a través de la capa compartida.
- **Sin IaC.** La infra AWS se crea a mano siguiendo [docs/AWS-SETUP.md](docs/AWS-SETUP.md);
  después se automatiza con scripts de AWS CLI en `infra/`. Todo recurso nuevo se documenta en
  esa guía (nombre, región, configuración) para poder recrearlo.
- Nombres de tablas, pool de Cognito, secretos y variables de entorno: los de docs/AWS-SETUP.md.
- Validar el body de cada request; responder errores con `{ error, message }` y el status HTTP adecuado.
- Nada de secretos, wallet addresses privadas de prueba con llaves, ni tokens de grants en commits.
- Idioma: código e identificadores en inglés (como en el diagrama); docs y comentarios en español.
