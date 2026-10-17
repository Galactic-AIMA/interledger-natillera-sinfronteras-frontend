# Estado de los repos y qué falta · 2026-10-16 ~23:40

Revisión de Henry con Claude Code. Reemplaza a [estado-2026-10-16-tarde.md](estado-2026-10-16-tarde.md), que queda como histórico.

## Front (`Galactic-AIMA/...-frontend`, rama por defecto `main`)

| Qué | Estado |
|---|---|
| `main` (`15b3f81`, 23:30) | Trae todo: PR #1 (16:39), modo híbrido, Metas, pagos P2P reales, bloque A real, PR #2 `feat/natillera-real` (cuota real, 23:29) y varias natilleras con selector en la 10 (`c916920`) |
| `feat/natillera-real` (Henry) | `main` + limpieza del registro de prompts y docs al día. Falta llevarla a `main` |
| `npx tsc --noEmit` | limpio |
| `npm test` | 15/15 |
| `node scripts/ai-usage-check.mjs` | OK (13 archivos de prompts) |
| Celular real / Expo Go | **Sin probar de punta a punta** (Camilo; Henry no tiene Expo Go) |

Desde las ~17:00 no se cambia el diseño de las pantallas; lo que entró después es conexión con el back.

### Modo de la app

- **Demo** («Empezar con datos de ejemplo» o `EXPO_PUBLIC_USE_MOCKS=1`): Doña Rosa, Luz y Andrés, todo local.
- **Híbrido** (con `EXPO_PUBLIC_COGNITO_CLIENT_ID`): registro, login y perfil reales; cada función pasa a real cuando aparece en `EXPO_PUBLIC_REAL_METHODS`. Con el bloque A:

  ```
  EXPO_PUBLIC_REAL_METHODS=getMyNatillera,createNatillera,getInvitation,joinNatillera,listAccounts,saveAccount,startPayment,finishPayment,getPayment,listPayments
  ```

  `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id` y `EXPO_PUBLIC_PAYMENTS_START_PATH` vacío (`/start-payment` es la ruta vieja). Ver [`.env.example`](../.env.example).

## Back (`duvanjaramillomarin/...-backend`, rama por defecto `master`)

| Rama | Qué hay |
|---|---|
| `master` | Solo `initial commit`. **Sigue sin existir `main`** |
| `david` (`d54a895`, 22:49) | Bloque A desplegado y probado, `GET /me` con `userId = username` (PR #2 del back), `docs/CURLS.md` con todas las rutas |
| `feat/natilleras-multi` | Varias natilleras por persona (`GET /natilleras`), 3 commits por delante de `david`, **sin fusionar ni desplegar** |
| `duvdev` | `start-payment` de Duvan, superado por `david` |

API REST `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev`, autorizador Cognito con **IdToken**.

**Prueba sin token (23:40):** `POST /payments` y `GET /natilleras/mine` → 401 (existen). `POST /payments/preview`, `GET /natilleras`, `POST /recurring` y `GET /loans/mine` → 403 (no existen). La app ya trata ese 403 como «sin back»: vista previa «se calcula al confirmar», selector de natilleras oculto, recurrentes y préstamos en modo de ejemplo.

## Lo que falta, por prioridad

### P0 · pago real en la demo

1. **Camilo:** probar en un celular con Expo Go y el `.env` de arriba: registro real → crear natillera → invitar → unirse con otra cuenta → poner la cuota (26/11 → 28 → Test Wallet → 30 → 34) con dos cuentas reales.
2. **Test Wallet:** wallet COP que recibe y la del fondo, para mostrar EUR → COP.
3. **Video de respaldo** del pago de punta a punta antes de las 08:00.

### P1 · reglas de la hackatón (descalifican si faltan)

4. **Back sin `main`:** crear `main` con el contenido de `david` (y fusionar `feat/natilleras-multi` si se despliega).
5. **Front:** llevar `feat/natillera-real` a `main` (todo termina en `main`).
6. `AI_USAGE.md` «What We Did Ourselves» completo y la respuesta sobre los bocetos de Figma (front y back).
7. Checklist de [MEMORY.md](../MEMORY.md): curso de los 4, APK en un Android real, slides en la plantilla oficial, formulario.

### P2 · si sobra tiempo

8. Desplegar `GET /natilleras` (el selector de la 10 aparece solo).
9. Préstamos (`/loans/*`, fase 1 sin Open Payments en una sesión de Henry), recurrentes y `/payments/preview`: hoy se muestran en modo de ejemplo.
