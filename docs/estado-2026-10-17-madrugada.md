# Estado de los repos y qué falta · 2026-10-17 ~03:25

Revisión de Henry con Claude Code. Reemplaza a [estado-2026-10-16-noche.md](estado-2026-10-16-noche.md), que queda como histórico.

**Entrega: hoy a las 11:00. Pitch a las 12:00.**

## Front (`Galactic-AIMA/interledger-natillera-sinfronteras-frontend`)

| Qué | Estado |
|---|---|
| `main` (`87d1be3`, 02:56) | Todo lo anterior + logo Anillos (ícono, splash animado, anillos en la espera), botón flotante «Logs» (apagado por defecto, se prende en Su cuenta), barrido UX/UI de Camilo (Ayuda como hogar, cuota con anillos, «¿Quién ya puso?») y la presentación `docs/pitch/pitch.html` |
| `feat/natillera-real` (Henry) | `main` + pitch y video (`docs/pitch/pitch-y-video.html`), mensaje a Duvan sobre `start-payment` y este estado. Falta llevarla a `main` (solo docs) |
| `npx tsc --noEmit` | limpio |
| `npm test` | 15/15 |
| `node scripts/ai-usage-check.mjs` | OK |
| Celular real / APK | Sin confirmar de punta a punta |

El front ya tiene escritas en `src/api/httpApi.ts` **todas** las rutas del back, incluidas las de préstamos fase 2 y cuota automática. Se pasan a reales con `EXPO_PUBLIC_REAL_METHODS` cuando el back las despliegue (ver abajo).

## Back (`duvanjaramillomarin/interterledger-natillera-sin-fronteras-backend`)

La rama por defecto sigue siendo `master`, pero `master` es el commit inicial. Lo vigente está en `main` y `david`.

| Rama | Último commit | Qué trae |
|---|---|---|
| `main` | `65fdfd3` (02:03) — PR #7 | **`start-payment` funcionando** (Duvan, fases 2 y 3 encadenadas), tabla `natillera-payments`, préstamos fase 1 (#3), varias natilleras en préstamos (#4), README (#5) |
| `david` | `20622e3` (03:01) — 10 commits por delante de `main` | + varias natilleras por persona (#8), `POST /payments/preview`, préstamos **fase 2** y **cuota automática** con Open Payments (#9) |

PR #6 (redesplegar `start-payment`) quedó cerrado: lo reemplazó el #7. El diagnóstico de [MENSAJE-DUVAN-START-PAYMENT.md](MENSAJE-DUVAN-START-PAYMENT.md) queda como histórico.

### Qué está desplegado en `dev` (curl sin token, 03:25)

`401` quiere decir que la ruta existe y pide token. `403` quiere decir que la ruta no existe en API Gateway.

| Ruta | Respuesta | Lectura |
|---|---|---|
| `POST /payments`, `GET /natilleras/mine` | 401 | desplegadas |
| `POST /payments/preview` | 401 | **desplegada** (`previewQuote` ya está en `eas.json`) |
| `POST /loans/requests/{id}/repayment-grant`, `POST /loans/repayment/{grantId}/finish` | 403 | **sin desplegar** (fase 2 de préstamos) |
| `POST /recurring`, `POST /recurring/{grantId}/charge-now` | 403 | **sin desplegar** (cuota automática) |

Según el back, solo David tiene la CLI de AWS: él despliega con `infra/deploy-prestamos.sh` (tabla `natillera-grants`, 5 Lambdas y 5 rutas).

### Cuando David despliegue la fase 2

Agregar a `EXPO_PUBLIC_REAL_METHODS` en `eas.json` los métodos de esas rutas. Los nombres exactos están en `src/api/httpApi.ts`, líneas 244–255. Después hay que volver a generar el APK. Si no alcanza el tiempo, el permiso de cobro y la cuota automática **se muestran en demo** en el pitch, y está bien.

## Qué falta para la entrega, por prioridad

1. **Pago real grabado** con la Test Wallet en el APK (video de respaldo antes de las 08:00).
2. **Back: `david` → `main`** (PR en el repo del back) para que todo quede en `main`.
3. **Front: `feat/natillera-real` → `main`** (solo docs).
4. **Un solo repo (regla de la hackatón):** renombrar el front a `interledger-natillera-sin-fronteras` y meter el back en `backend/` con `git subtree add --prefix=backend` (sin `--squash`) desde la rama final del back. Se hace cuando la versión que vamos a presentar esté lista. Detalle en el checklist de [MEMORY.md](../MEMORY.md).
5. `AI_USAGE.md` de los dos lados completo, con "What We Did Ourselves" lleno.
6. Slides en la plantilla oficial, link de demo en el Drive y formulario enviado.
