# Estado de los repos y qué falta · 2026-10-16 ~16:45

> **Histórico.** El estado vigente (23:40, bloque A del back desplegado) está en [estado-2026-10-16-noche.md](estado-2026-10-16-noche.md).

Revisión de Henry con Claude Code. Se trajeron front y back de GitHub; nada se subió ni se borró.

> **Actualización 2026-10-16 ~17:15 (manda sobre lo de abajo):**
> - **Front:** el PR #1 (`feat/cuenta-celular` → `main`) **se fusionó a las 16:39**. Después Camilo subió a `main` (`47213b6`, 16:52): modo híbrido (`src/api/hybridApi.ts`, `EXPO_PUBLIC_REAL_METHODS`), arreglos de la 02/03, registro técnico, selector de indicativo de país y la función **Metas** (36–38). `feat/cuenta-celular` ya tiene todo `main` (fusión `a912952`). `npm test` **12/12** y `ai-usage-check` OK. **`tsc` NO está limpio en `main`:** 2 errores TS7006 en `src/api/hybridApi.ts:16-17` (parámetro `name` sin tipo); no afectan la app, pero hay que arreglarlos antes de las 11:00 (Camilo).
> - **Decisión 16/10 ~17:00:** el diseño del front se queda como está; no se hacen más cambios de pantallas.
> - **Back:** `david` `4d38582` (16:49) tiene start/finish/get payment según el contrato del front, con modo VTL. **Desplegada solo `/start-payment`** (401 sin token); `/payments`, `/payments/{id}`, `/payments/{id}/finish`, `/me` y `/natilleras/mine` siguen en 403 (no existen). El front llama `POST /payments`, no `/start-payment`: el back debe crear las rutas del contrato o avisar para mapearlas. Detalle: [COORDINACION-BACK.md](COORDINACION-BACK.md).
> - Los puntos 9 (PR) y la parte de `tsc` limpio de la tabla de abajo quedaron superados por esto.

## Front (`Galactic-AIMA/...-frontend`, público, rama por defecto `main`)

| Qué | Estado |
|---|---|
| `main` (`b5f40ac`, 15:26) | Trae la rama de Henry solo hasta `b7729fa` |
| `feat/cuenta-celular` | **7 commits por delante de `main`**, 0 por detrás. El último (`7851b17`, presentación editable) **no está subido** |
| PR a `main` | **No existe** (solo el enlace de comparación). Sin PR, `eas.json`, `openapi.yaml`, el arreglo de Andrés «al día» y la billetera https no llegan a `main` |
| `npx tsc --noEmit` | limpio |
| `npm test` | 9/9 |
| `node scripts/ai-usage-check.mjs` | OK (28 commits con IA, 9 archivos de prompts) |
| Pantallas | 31 propias hechas y probadas en demo (web y emulador) |
| Celular real / Expo Go | **Sin probar** (Camilo) |

## Back (`duvanjaramillomarin/...-backend`, público, rama por defecto `master`)

| Rama | Qué hay |
|---|---|
| `master` | Solo `initial commit` (11:06). **No existe `main`** |
| `david` (16:28) | `pre-signup` y `GET /me` desplegados; `start-payment`, `finish-payment`, `get-payment` escritos con el contrato del front, zips listos; `AI_USAGE.md`, `/prompts`, docs |
| `duvdev` (15:43) | `start-payment` de Duvan (con los 8 bloqueantes que David le anotó). **No está fusionada con `david`** |
| PRs | Ninguno |

API desplegada: REST, stage `dev`, `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev`, autorizador Cognito con **`IdToken`**.

**Prueba sin token (16:40):** `GET/POST /payments`, `/payments/{id}`, `/payments/{id}/finish` y `/me` responden `403 Missing Authentication Token`. Con un token falso, API Gateway responde un error de firma SigV4 en vez de `401 Unauthorized`. Eso es lo que hace un API REST cuando **la ruta no existe en el stage**: lo más probable es que falte *Deploy API* al stage `dev` después de crear los recursos, o que no se haya creado `/me` en el API REST (estaba en el HTTP API). **David debe confirmarlo.**

## Lo que falta, por prioridad

### P0 · sin esto no hay pago real en la demo

1. **David:** *Deploy API* → stage `dev` y confirmar que `POST /payments` sin token da `401`, no `403`.
2. **David:** tabla `payments-history` con el GSI `author-index`, rol `natillera-payments-role` y las 3 Lambdas (pasos 2 a 5 de `docs/API-PAGOS.md` del back).
3. **Lo que la app pide al entrar** no existe en el back: `GET /me` (en el API REST) y `GET /natilleras/mine`. Sin ellos, la pantalla 10 sale con error en modo real aunque el pago funcione. Opciones: (a) el back crea esas dos rutas con datos semilla de Doña Rosa, Luz y Andrés; (b) **el pago real se muestra solo por la ruta P2P** y el resto de la demo va en modo de ejemplo. Decidir ya.
4. **Pagar a quién:** el back resuelve `p2p` por `customWalletName` en `saved-accounts`, pero no hay `GET/POST /accounts`. La app manda `customWalletName`. Hay que cargar a mano en `saved-accounts` la cuenta de la persona que recibe (con el mismo nombre que la app muestra en la 26/27).
5. **Front (`.env` de Camilo, no versionado):** `EXPO_PUBLIC_API_URL=<URL de arriba>` y `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id`. El front ya soporta `id` (`src/api/config.ts`, `src/api/auth.ts:169`); `.env.example` dice `access`, ya no sirve.
6. **Test Wallet:** falta la wallet COP que recibe y la del fondo (paso 1 de `AWS-SETUP.md`: 🟡). Sin ellas no hay EUR→COP en pantalla.
7. **Prueba de punta a punta en un celular** con Expo Go: registro real → 26 → 28 → Test Wallet → 30 → 34. Nadie la ha hecho; Henry no tiene Expo Go.

### P1 · reglas de la hackatón (descalifican si faltan)

8. **Back sin `main`:** crear `main` con el contenido de `david` (+ lo útil de `duvdev`). Hoy `master` está vacío.
9. **Front:** abrir y fusionar el PR `main...feat/cuenta-celular` y subir `7851b17`.
10. `AI_USAGE.md` "What We Did Ourselves": completar la lista de archivos con poca o ninguna IA y responder si los bocetos de Figma usaron IA (front y back).
11. Checklist de MEMORY.md: curso de los 4, APK en un Android real, video de respaldo antes de las 08:00, slides en la plantilla oficial, formulario.

### P2 · si sobra tiempo

12. Recurrentes (`/recurring`, `charge-now`), préstamos (`/loans/*`), `/payments/preview` y `/wallets/verify` con sesión: no existen en el back. La app los tiene en demo; en el pitch se muestran en modo de ejemplo.
13. Fusionar `duvdev` con `david` (hoy son dos versiones distintas de `start-payment`) para que el repo final no confunda al jurado.

## Notas

- El repo del front se movió a `Desktop\Natillera-sin-Fronteras\natillera-front`. Las sesiones abiertas en la carpeta vieja ya no guardan los prompts solas (el hook vive en el repo). Hay que abrir las sesiones nuevas en la carpeta nueva.
- Usuario de prueba `pruebafront28396`: su contraseña no quedó en ningún lado. Para probar se crea otro desde la pantalla 02.
