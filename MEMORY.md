# MEMORY.md — tablero compartido del frontend

Estado vivo. Cada sesión lo lee al empezar y actualiza **solo su sección** al terminar. Fechas y horas absolutas (hora de Colombia).

## Estado general

- 2026-10-16 — Repo vacío creado. Setup inicial: CLAUDE.md, MEMORY.md, AI_USAGE.md, hook de prompts, docs (Camilo + Claude Code).
- 2026-10-16 23:40 — **Estado vigente:** [docs/estado-2026-10-16-noche.md](docs/estado-2026-10-16-noche.md). Bloque A del back desplegado; `main` del front trae cuota real, pagos reales y varias natilleras. `tsc` limpio, `npm test` 15/15.
- Entrega: **2026-10-17 11:00**. Grabar video de respaldo antes de las 08:00.

Plan completo: [docs/PLAN.md](docs/PLAN.md) · guía de Henry: [docs/HENRY.md](docs/HENRY.md)

## Carriles

| Carril | Alcance | Persona | Sesión / rama | Estado |
|---|---|---|---|---|
| `base` | Scaffold Expo, tema, componentes, `src/api` (+ mocks), auth, navegación | Camilo; **Henry a cargo mientras Camilo descansa (desde 2026-10-16 ~12:45)** | `feat/creditos` | lista; arreglos de seguridad aplicados |
| `cuenta-natillera` | Pantallas 01–10, 15, 35 | Camilo (sesión A) | `feat/cuenta-natillera` · worktree `frontend-cuenta` | **en `main`** (`ffd9917`, 2026-10-16); falta probar en celular |
| `pagos` | Pantallas 11–14, 26–34 (incluye retorno de billetera) | Camilo (sesión B) → Henry (auditoría de seguridad) | integrado en `feat/creditos` (fork de Henry) | **hecha en demo y probada** (2026-10-16 ~13:45); falta Expo Go y Test Wallet. PR: ver [docs/INTEGRACION-EXPO-GO.md](docs/INTEGRACION-EXPO-GO.md) |
| `creditos` | Pantallas 16–25 | Henry (+ Camilo en la madrugada) | `feat/creditos` (fork de Henry; contiene `main` `32eb791`) | **hecha en demo y probada** 16→24 (2026-10-16 ~13:45); falta back |
| `pitch` | Slides en la plantilla oficial, guion de 5 min, video | Camilo + Henry | `docs/pitch/` | guion y contexto en borrador ([docs/pitch/GUION.md](docs/pitch/GUION.md)); faltan slides |
| `auth-signup` | Registro directo a Cognito (encargo de Camilo) | Henry | `feat/auth-signup` (fork) e integrado en `feat/creditos` | **hecho**; falta probar contra Cognito real en Expo Go |
| `cuenta-celular` | Pulido en celular (`expo-clipboard`, botón volver) + textos de más impacto | Henry | `feat/cuenta-celular` (fork; sale de `feat/creditos`) | **hecho y probado en demo** (2026-10-16 ~14:10); el 2026-10-16 ~15:30 se le fusionó `feat/creditos` `4e4d5b1` (arreglos de `base`, `npm test`, región `us-east-2`, `web.output` estático): `tsc` limpio, `npm test` 8/8. **Fusionada en `main` (PR #1, 16:39)**; después recibió `main` `47213b6` (modo híbrido, Metas) en `a912952`. Desde ~17:00 el front no se toca más (decisión de Henry); falta probar en celular (Camilo) |
| `pagos-reales` | Pagos P2P y bloque A contra el back real (modo híbrido), varias natilleras con selector en la 10 | Camilo | `feat/pagos-reales` → `main` | **en `main`** (`200bcc7`, `c916920`, 23:28); falta probar en celular |
| `natillera-real` | Cuota real cuando la natillera es real; cuentas guardadas por nombre | Henry | `feat/natillera-real` | **en `main`** (PR #2, 23:29); docs al día después, falta llevarlas a `main` |
| `metas` | Pantallas 36–38 (Metas: ahorro y colecta) + sección en la 10 + fecha en los movimientos | Camilo | `feat/metas` → `main` | **en `main`** (`47213b6`; fechas en `7c01a6e`); probado en web en modo demo; falta celular y una billetera real de beneficiario. Diseño: [docs/superpowers/specs/2026-10-16-metas-design.md](docs/superpowers/specs/2026-10-16-metas-design.md) |

## Decisiones tomadas

- 2026-10-16 — Expo + APK Android para la demo. **Por qué:** deep link de regreso de la billetera fiable y build rápido.
- 2026-10-16 — Contrato + mocks: el front no espera al back. **Por qué:** quedan menos de 24 h.
- 2026-10-16 — Las 31 pantallas propias navegables y todas conectadas al back (incluidos préstamos).
- 2026-10-16 — Login con Cognito (JWT). Pitch en español.
- 2026-10-16 — Metas solo en el front: ahorro = apartar del fondo; colecta = pago p2p real con `walletAddress` a la billetera del beneficiario. El progreso es por celular hasta que el back guarde `goalId` (propuesta para después de la entrega).

- 2026-10-16 — El contrato manda desde `docs/openapi.yaml` del repo back. Front solo con mocks hasta la madrugada. Las decisiones abiertas del back (IaC, JS/TS, periodo, tasa, amortización) las deciden Duvan y David Ciro; el front pinta lo que devuelvan.

- 2026-10-16 — Ejecución de pantallas: 2 sesiones en paralelo (`feat/cuenta-natillera`, `feat/pagos`), camino del pitch primero, pulido solo en 01/10/11/28/34, celular con Expo Go + emulador de respaldo. Plan: [docs/EJECUCION-PANTALLAS.md](docs/EJECUCION-PANTALLAS.md).

## Propuestas al back (pendientes de respuesta)

> **2026-10-16 ~16:00:** estado real del back verificado (solo Cognito + pre-signup desplegados; pagos sin código) y pedidos priorizados con formatos JSON en [docs/COORDINACION-BACK.md](docs/COORDINACION-BACK.md). Esa lista manda sobre la de abajo.

1. `finish.uri` https del back que verifique el hash y responda 302 a `natillera://retorno?paymentId=…&result=…` (su flujo 4 manda `interact_ref` desde la app sin verificar el hash). El front soporta ambos.
2. Que "iniciar pago" devuelva también `debitAmount` y `receiveAmount` de la quote (pantallas 11, 16, 26, 28).
3. Endpoint demo `charge-now` para mostrar el cobro recurrente en vivo.
4. `GET /payments/{id}` para el polling de la pantalla 30.
5. Entrega en `main` (hoy usan `master`) y `AI_USAGE.md` + `/prompts` en la raíz de su repo (hoy tienen `docs/USO-IA.md`, que no cumple la política).

## Pedidos entre carriles

- 2026-10-16 · de base a todos: **los prompts ahora se guardan en `prompts/AAAA-MM-DD-<persona>-<rama>.md`** (el hook incluye la rama). Al traer `main` a su rama, el hook nuevo queda activo. Si al integrar chocan dos `prompts/2026-10-16-camilo.md` de ramas distintas, se concatenan; nunca se descarta ninguno.

- 2026-10-16 · de base a pagos: Henry, empieza por la Parte A de [docs/HENRY.md](docs/HENRY.md) (wallets de prueba, monedas, `natillera://`, curso, slides). Camilo avisa aquí cuando `base` esté lista para que arranques las pantallas.
- 2026-10-16 · de base a todos: **`base` lista en `main`.** Ya pueden arrancar pantallas: cada ruta tiene un placeholder con su número; reemplácenlo completo. Guía rápida en "Cómo usar la base" de [docs/HENRY.md](docs/HENRY.md) y en la bitácora `base`.
- 2026-10-16 · de base a todos: **estado real de las ramas:** `main` = base + cuenta-natillera (`ffd9917`); `feat/pagos` = pagos sin integrar; `creditos` sin empezar. Quien toque `src/api`, `src/components` o `Screen` lo pide aquí.
- 2026-10-16 · de pagos a base: `openWallet` en demo no funcionaba en web (`Alert` sin botones en react-native-web). Con OK de Camilo, pagos agregó un fallback `window.confirm` en `src/api/wallet.ts`; base, revísalo al mergear. Pendiente de base: el mock devuelve `fee` aunque no haya conversión (`mockApi.ts` ~137), la UI ya lo oculta.
- 2026-10-16 12:50 · de pagos a base: `main` ya está fusionado en `feat/pagos` (`da44d32`); Camilo dio OK; como HenryStark866 no tiene escritura en Galactic-AIMA, la rama integrada se subió a su fork (ver docs/SESIONES-HENRY.md). Plan de sesiones paralelas de Henry en [docs/SESIONES-HENRY.md](docs/SESIONES-HENRY.md): C (`creditos`) es la única que toca `resultado.tsx`, `volviendo.tsx` y `ResultKind`; D (`cuenta-celular`) es la única que toca `package.json`.
- 2026-10-16 · de base a Henry: **registro directo a Cognito** (el back no tiene `POST /signup`). Encargo completo en [docs/ENCARGO-SIGNUP-COGNITO.md](docs/ENCARGO-SIGNUP-COGNITO.md). Camilo te autoriza a tocar `auth.ts`, `httpApi.ts` y `types.ts` solo para esto.
- 2026-10-16 13:35 · de Henry a base: registro Cognito hecho en `feat/auth-signup` (solo `auth.ts`, `httpApi.ts`, `types.ts`, pantalla 02, `.env.example` y `api-contrato.md`). **Pedido:** `src/api/config.ts` tiene `cognitoRegion` por defecto `us-east-1`; el back está en `us-east-2`. Mientras tanto `.env.example` ya trae `us-east-2` y el `ClientId` público.
- 2026-10-16 13:50 · de Henry a base: **rama lista para integrar** `feat/creditos` (pagos + seguridad + créditos + Cognito, sobre tu `main`). Guía, cambios en `src/api` y lista de pruebas en Expo Go: [docs/INTEGRACION-EXPO-GO.md](docs/INTEGRACION-EXPO-GO.md). Ojo: `verifyWallet` sin sesión ahora consulta la dirección de pago pública (sin eso la 02 no registra en modo real).
- 2026-10-16 14:10 · de Henry a base: `feat/cuenta-celular` = `feat/creditos` + pulido. Toca `package.json` (solo `expo-clipboard ~58.0.3`) y añade `src/features/navegacion/BackButton.tsx` (no se tocó `src/components`). Si la apruebas, **integra esta rama en vez de `feat/creditos`**.
- 2026-10-16 15:30 · de Henry a base: `feat/creditos` había seguido avanzando (6 commits) después de abrir `feat/cuenta-celular`; ya están fusionados en `feat/cuenta-celular`. Incluye cambios en tus archivos (`config.ts` → `us-east-2`, `app.json` `web.output` → `single`, `RevokeToken`/`friendlyError` en `auth.ts`/`httpApi.ts`, `.gitignore`, hook): revísalos en el PR, todos reversibles.
- 2026-10-16 15:45 · de Henry a base: Henry aceptó la invitación y subió **`feat/cuenta-celular` al repo del equipo** (`b7729fa`, 22 commits por delante de `main` y 0 por detrás). PR: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/main...feat/cuenta-celular. **Henry no tiene Expo Go:** las 8 pruebas en celular de [docs/INTEGRACION-EXPO-GO.md](docs/INTEGRACION-EXPO-GO.md) (Cognito real, Test Wallet, back) las haces tú en tu PC. Henry sigue con Test Wallet, slides y la entrega.
- 2026-10-16 16:00 · de Henry a base: tres cambios en tus archivos, todos para que la demo y el registro real no fallen: (1) `mockApi.ts`: cuotas exigidas a la fecha = 1 (antes 2), así Andrés queda «al día» al poner la cuota en el camino del pitch (prueba nueva en `tests/e2e.test.mjs`); (2) `auth.ts`: la billetera va a Cognito como URL https (el pre-signup rechazaba `$ilp…`, probado) y los 5 motivos en inglés del pre-signup se traducen a «usted»; (3) `httpApi.ts`: `getMe` usa `username` si el back no manda `displayName`. Además `eas.json` (perfil `preview`, APK) para el build. `tsc` limpio, `npm test` 9/9.
- 2026-10-16 16:45 · de Henry a base y back: **`docs/openapi.yaml` no existía** (el back lo cita como fuente de verdad). Creado desde `api-contrato.md` + `types.ts`: 20 rutas, P0 marcadas. `main` (`b5f40ac`) traía la rama solo hasta `b7729fa`; ya se fusionó en `feat/cuenta-celular` sin conflictos. Falta llevar a `main` lo de después (`879a239`, `4ce0df4` y esto): mismo PR `main...feat/cuenta-celular`.
- 2026-10-16 17:15 · de Henry a base: (1) **`tsc` no está limpio en `main`**: `src/api/hybridApi.ts:16-17` TS7006 (`.map((name) =>` y `.filter((name)…` sin tipo; basta `(name: string)`); (2) el API desplegado usa **IdToken** pero `.env.example` dice `EXPO_PUBLIC_AUTH_TOKEN_TYPE=access`; (3) en API REST una ruta que no existe responde **403**, no 404: `previewQuote` solo cae a «se calcula al confirmar» con 404/405. Henry ya no toca el front: son tuyos. Estado completo en [docs/estado-2026-10-16-tarde.md](docs/estado-2026-10-16-tarde.md).
- 2026-10-16 17:15 · de Henry a back: solo existe `/start-payment` en el stage `dev`; el front llama `POST /payments`, `POST /payments/{id}/finish`, `GET /payments/{id}`, `GET /me` y `GET /natilleras/mine` (ver [docs/openapi.yaml](docs/openapi.yaml)). Creen esas rutas (o avisen el nombre final) y hagan *Deploy API*. Con eso Camilo pone `EXPO_PUBLIC_REAL_METHODS=startPayment,finishPayment,getPayment`.
- 2026-10-16 23:00 · de Henry a base: **back con bloque A desplegado** (perfil, natilleras, invitaciones, cuentas, pagos). PR `feat/natillera-real` → `main` para que la cuota vaya real cuando `getMyNatillera` es real (`hybridApi.ts` + prueba). Tras fusionar, en tu `.env`: `EXPO_PUBLIC_REAL_METHODS=getMyNatillera,createNatillera,getInvitation,joinNatillera,listAccounts,saveAccount,startPayment,finishPayment,getPayment,listPayments` y probar crear natillera → invitar → unirse → poner cuota con dos cuentas reales.
- 2026-10-17 01:00 · de Henry a back: préstamos fase 1 (sin Open Payments) en el PR #3 del back (`back/feat-prestamos`): simular, pedir, listar pendientes, mi préstamo y rechazar. Ciro despliega con `infra/deploy-prestamos.sh`. Fase 2 (grant de cuotas + desembolso) pendiente con Duvan; préstamos sigue en demo en la app.
- Formato: `AAAA-MM-DD HH:MM · de <carril> a <carril>: <qué>`
- ~~2026-10-16 12:45 · de pagos a base: 4 arreglos en archivos compartidos~~ **Hecho por Henry 13:00 (Camilo descansando)**: (logout con `RevokeToken`, errores no-JSON en `httpApi`, `.gitignore` con `.env*`, patrones del hook). Lista en [docs/auditoria-2026-10-16.md](docs/auditoria-2026-10-16.md).
- 2026-10-16 12:45 · de pagos a back (Camilo, reenviar a Duvan y David): el back aún no tiene código y sus rutas tentativas no cuadran con el contrato. Prioridad: `GET /payments/{id}` → `returnUrl` (lista blanca) y `debitAmount`/`receiveAmount` al iniciar → `charge-now`. Opción B con hash obligatorio; ignorar `result` del cliente; `natilleraId`. Detalle en el mismo doc.

## Pendientes para Henry (2026-10-16 ~12:40)

**Actualización 12:50:** el reparto en sesiones paralelas, la hora de cada pendiente y los encargos listos para pegar están en [docs/SESIONES-HENRY.md](docs/SESIONES-HENRY.md). El aviso de integración de abajo ya está resuelto en `feat/pagos` (`da44d32`).

Orden sugerido. Detalle y comandos en la sección "Pendientes de Henry" de [docs/HENRY.md](docs/HENRY.md).

| # | Pendiente | Dónde | Listo cuando |
|---|---|---|---|
| 1 | Probar 11 → 28 → 30 → 34 en Expo Go (celular) y en web, en modo demo | rama `feat/pagos` | Recorrido sin errores; fallos anotados en bitácora `pagos` |
| 2 | Parte A: wallets de prueba, monedas (¿COP?), `natillera://` como finish URI | Test Wallet | Respuesta en bitácora `pagos` y aviso a Duvan |
| 3 | Préstamos 16–25 (carril `creditos`), reutilizando `antesHref`/`volviendoHref` de `src/features/pagos/flow.ts` | rama `feat/creditos` | 19 y 23 en `resultado.tsx`; rama de préstamo en `volviendo.tsx` |
| 4 | Pulido de copy ("usted", frases cortas) | `docs/copy-henry.md` | Lista de cambios propuestos, sin tocar el Figma |
| 5 | Slides en la plantilla oficial + guion de 5 min | Google Slides | Esqueleto con problema, solución, demo, impacto, equipo |
| 6 | Curso de Platzi o Guide to Open Payments | — | Marcado en el checklist de abajo |
| 7 | Cuenta-natillera en celular: `expo-clipboard` para "Copiar el enlace" y botón volver en pantallas sueltas | rama nueva desde `main` | Probado en Expo Go |

**Aviso de integración:** `feat/pagos` y `main` chocan en `AI_USAGE.md`, `MEMORY.md` y `prompts/2026-10-16-camilo.md` (verificado con `git merge-tree` el 2026-10-16). Se resuelven conservando las dos versiones y **concatenando** los prompts. `feat/pagos` además no trae la fusión de `main` (hook de prompts por rama, `Screen` con `headerRight`).

## Checklist de entrega

- [ ] Los 4 hicieron el curso de Platzi o la Guide to Open Payments
- [ ] Declarar si los bocetos de Figma o el diagrama usaron IA
- [ ] Pago de punta a punta con la Test Wallet grabado
- [ ] APK instalado en un Android real
- [ ] `AI_USAGE.md` completo y `node scripts/ai-usage-check.mjs` limpio (front y back)
- [ ] Todo en `main`, repos públicos
- [ ] Slides en la plantilla oficial + link de demo en el Drive del equipo + formulario enviado

## Bitácora por carril

### base
- 2026-10-16 — Setup de contexto y sistema de uso de IA (hook probado: guarda literal y tapa llaves).
- 2026-10-16 ~11:50 — Scaffold Expo SDK 58 (Expo Router en `src/app/`, RN 0.88, TS 6). Ejemplo de plantilla eliminado; `src/theme/colors.ts` con la Paleta G. `tsc` ok, `expo-doctor` 20/20, bundle Android ok. Sin commit todavía (falta OK de Camilo). Siguiente: tema completo, fuentes, componentes, `src/api` + mocks.
- 2026-10-16 ~12:40 — **Base lista.** Qué hay y cómo se usa:
  - `src/theme`: tokens (`palette`, `space`, `radius`, `touch`, `typeScale`), fuentes Gloock/Hanken Grotesk/Martian Mono y `TextScaleProvider` (botón A+, 3 niveles).
  - `src/components`: `Screen` (título + A+ + scroll + `footer`), `AppText`, `Button`, `Card`, `InfoRow`/`LinkRow`, `TextField`, `Choice`, `StatusPill`, `ResultScreen` (✓ ✕ ! y espera), `Placeholder`.
  - `src/api`: `useApi()`, hooks `useMe`/`useMyNatillera`/`usePayments`/`useAccounts`/`useMyLoans`/`usePendingLoanRequests`, `keys` para invalidar, `openWallet()` (en demo un diálogo hace de billetera) y `waitForFinalPayment()`.
  - `src/utils/money.ts`: `formatAmount`, `toMinorUnits`, `currencyName` (12 casos probados).
  - Rutas: `(auth)` 01–03 · `(tabs)/natillera` 05–12, 15–25 · `(tabs)/pagar` 26–27 · `(tabs)/ayuda` 35 · `cuenta` 04 · `billetera/antes` 28 · `billetera/volviendo` 30 · `resultado` 14/19/23/31–34 · `retorno` (deep link).
  - Probar: `npm run web` o `npx expo start` → "Empezar con datos de ejemplo" (Doña Rosa; en demo Luz y Andrés también existen, contraseña cualquiera).
- 2026-10-16 ~12:40 — Auditoría de sesiones: memoria, tablero, `AI_USAGE.md` y prompts al día; traspaso a Henry documentado. Hallazgo: `feat/pagos` choca con `main` en 3 archivos de documentación.
- 2026-10-16 ~13:15 — Plan de ejecución (`docs/EJECUCION-PANTALLAS.md`), worktrees `frontend-cuenta` y `frontend-pagos` creados, encargos de las sesiones en `prompts/2026-10-16-camilo-encargos-sesiones.md`, prompts de la sesión paralela recuperados de su transcripción, hook con la rama en el nombre. Sesión del emulador Android instalando el SDK.

- 2026-10-16 ~13:35 — (Henry + Claude) Registro directo a Cognito según el encargo y el mensaje del back: `signUp` en `src/api/auth.ts` (POST a `cognito-idp.us-east-2`, `X-Amz-Target` SignUp, `email`/`phone_number`/`custom:walletId`), `httpApi.signup` = SignUp + login, errores `UserLambdaValidationException` (motivo del back sin el prefijo técnico), `UsernameExistsException`, `InvalidPasswordException`, `InvalidParameterException` en "usted". Pantalla 02 valida `+57` + 10 dígitos (quita espacios) y la política de contraseña. `tsc` limpio. **Falta probar contra Cognito real en Expo Go** (desde la nube no hay salida a AWS).

- 2026-10-16 ~13:50 — (Henry + Claude) Para modo real: `verifyWallet` sin sesión → dirección de pago pública de Open Payments (GET JSON); `getAuthToken` descarta un token vencido sin refresh. `tsc` limpio. Pendiente tuyo: `config.ts` `us-east-2`.
- 2026-10-16 ~13:00 (Henry, cubriendo a Camilo) — Arreglos de la auditoría en archivos compartidos: `auth.ts` revoca el refresh token en Cognito al salir (y tolera respuestas no JSON); `httpApi.ts` ya no revienta con HTML/502 y muestra mensajes en «usted» por status en vez del `message` crudo del back; `.gitignore` ignora `.env*` salvo `.env.example`; el hook tapa `clave`/`pwd`/`pass`/`access_token`, secretos AWS sin etiqueta y cadenas largas (probado: no toca URLs ni hashes de commit). `tsc` ok.

- 2026-10-16 ~13:00 (Henry) — Pruebas en `tests/` (8 casos: cuota y p2p ok/rechazo, préstamo completo y rechazo, seguridad de la pasarela). Correr con `npm test` (Node 22+).

- 2026-10-16 ~13:50 (Henry) — Sincronizadas las dos sesiones de Henry: sobre `feat/creditos` del fork (Cognito, pruebas web, docs) entran los arreglos de `base` de la auditoría (`RevokeToken` al salir, errores no JSON con `friendlyError`, `.env*` ignorados, patrones del hook) y `npm test` (8 casos). `tsc` y pruebas ok. Con esto, los pendientes de `base` de INTEGRACION-EXPO-GO.md quedan hechos salvo `config.ts` (región) y `web.output`.

- 2026-10-16 ~14:05 (Henry, cubriendo `base`) — `config.ts`: región Cognito por defecto `us-east-2` (la del back). `app.json` `web.output`: `server` → `single` (sitio estático; `expo export --platform web` da `index.html` y la bienvenida carga sin errores de consola). Reversible si Camilo prefiere SSR.
- 2026-10-16 ~15:30 — Integración local de la rama completa de Henry (`origin/feat/cuenta-celular`, `b7729fa`, ya trae `feat/creditos` y `main`) en `integracion/henry`, sin push. `tsc` limpio, `npm test` 8/8, `ai-usage-check` OK. En el emulador `Natillera_Pixel_8` (Metro en 8082, modo demo porque el back aún no tiene URL de API Gateway): 01 → 10 → 11 → 28 → billetera demo → 34 sin errores; préstamos (16) abre bien. `src/api/auth.ts` coincide con las instrucciones de login del back (SignUp/InitiateAuth/refresh, SecureStore, errores). Falta: registro real en Cognito, pagos reales (el back no tiene `start-payment`/`finish-payment`) y prueba en celular físico.
- 2026-10-16 ~15:50 — **Modo híbrido** (`src/api/hybridApi.ts`, rama `feat/back-hibrido`): con `EXPO_PUBLIC_COGNITO_CLIENT_ID` la app arranca contra Cognito real (registro, login, perfil); natillera, pagos y préstamos siguen con los datos de ejemplo de Doña Rosa hasta que el back publique cada ruta. Para pasar una a real: `EXPO_PUBLIC_REAL_METHODS=startPayment,finishPayment,getPayment` (cuando `startPayment` es real, la billetera también lo es). Sin `EXPO_PUBLIC_API_URL` el perfil sale del IdToken + la wallet pública. «Empezar con datos de ejemplo» sigue siendo demo pura. Back hoy: solo `GET /me` (sin URL publicada); `POST /payments/start` en el back ≠ `POST /payments` del front: alinear.
- 2026-10-16 ~16:45 — **Registro técnico** (`/registro`, botón en Su cuenta): últimas 200 llamadas en memoria (Cognito, back, billetera, ejemplo) con copiar y limpiar; nunca cuerpos, contraseñas ni tokens. **Indicativo de país** en la 02 (`src/features/telefono/`): todos los países, buscador sin tildes, Colombia +57 por defecto y número en E.164 para Cognito. Probado en el emulador con la sesión real `prueba3`.
- 2026-10-16 ~17:15 — **Pagos P2P reales** (rama `feat/pagos-reales`, worktree `frontend-pagos-reales`): `.env` con la URL del API REST, `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id`, `EXPO_PUBLIC_PAYMENTS_START_PATH=/start-payment` y `EXPO_PUBLIC_REAL_METHODS=startPayment`. Solo P2P (Pagar y colectas de Metas) va al back; la cuota sigue de ejemplo. `finish` y `get` del back siguen sin desplegar (403): el pago real queda a medias hasta que David haga *Deploy API*. La cuenta de ejemplo "Luz" (`…/luz`) no existe en la Test Wallet: para probar, guardar una cuenta real (p. ej. `f9a1abde`, EUR).
- 2026-10-16 ~17:30 — Pedidos de Henry a `base` (17:15) resueltos en `feat/pagos-reales`: (1) tipos de `hybridApi.ts`, (2) `.env.example` con `EXPO_PUBLIC_AUTH_TOKEN_TYPE=id`, (3) `previewQuote` trata el 403 del API REST como ruta inexistente. Rama con `main` y `feat/cuenta-celular` fusionadas; sin push. Pruebas manuales del pago P2P: encargo en `sesiones/D-pruebas-pagos-reales.md` (fuera del repo).

### cuenta-natillera
- 2026-10-16 — Sesión A: construidas 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 15 y 35 (5 ejecutores Sonnet + validador Opus). `tsc` limpio; recorrido completo en web con demo, A+ ×1,4 sin cortes. Cambios en archivos compartidos: `Screen` ahora acepta `headerRight`; `enterDemo` hace `resetQueries`; el código de invitación del mock ya es válido en 07. Pendiente: probar en celular/Expo Go, `expo-clipboard` para copiar el enlace, botón volver en pantallas sueltas, `web.output` "server" → "single" (decide Camilo). 04 se abre desde el icono de persona en 10/05.

### pagos
- 2026-10-16 — Sesión B arranca con agentes: contrato del flujo en `src/features/pagos/flow.ts`; ejecutores Sonnet, validación Opus. Orden: 11→28→30→resultado, luego 26/27, luego 12/14.
- 2026-10-16 — Hechas 11, 28, 30, resultado (14, 31–34), 26, 27 y 12 (+ «Cobrar ahora» demo). `tsc` y export web ok; validación Opus encontró y se corrigieron 10 defectos. **Sin probar en celular/Expo Go** (pendiente). Faltan préstamos 16–25 (`resultado.tsx` admite 19 y 23 con un caso más).
- 2026-10-16 — **Traspaso a Henry (pagos → préstamos):** `feat/pagos` tiene 11, 12, 26, 27, 28, 30 y resultado. Falta: (1) probar 11→28→30→34 en Expo Go y web (el diálogo demo en web usa `window.confirm`); (2) préstamos 16–25: reutilizan `antesHref`/`volviendoHref` de `src/features/pagos/flow.ts`; para 19 y 23 agregar `'credito-autorizado'`/`'prestamo-desembolsado'` a `ResultKind` y una entrada en `VARIANTS` de `src/app/resultado.tsx` (TypeScript marca lo que falte); en `volviendo.tsx` añadir la rama `finishLoanRepaymentGrant`/desembolso. (3) PR de `feat/pagos` a `main` (pendiente de Camilo).
- 2026-10-16 ~12:45 (Henry) — Henry descarta su versión paralela de 11/26/27/28/30/resultado (duplicaba la de la sesión B) y trabaja sobre `feat/pagos`. Arreglos de seguridad y de mensajes de la auditoría en `src/features/pagos/flow.ts`, `billetera/antes.tsx`, `billetera/volviendo.tsx` y `resultado.tsx`: registro en memoria de flujos (`antesHref` registra, la 30 hace `settleFlow`), URL de billetera solo https de `*.interledger-test.dev`, éxitos solo si los confirmó la 30, `safeOrigin`, error de red → «sigue en proceso», atrás bloqueado en la 30 (Android). `tsc`, bundle y pruebas ok. Detalle: [docs/auditoria-2026-10-16.md](docs/auditoria-2026-10-16.md).

### creditos
- 2026-10-16 ~13:20 (Henry) — `feat/creditos` = `main` + `feat/pagos` + arreglos de seguridad (choques de docs resueltos conservando ambas versiones; prompts de Camilo unidos por sección, 17 de 17). Pantallas 16/20/25 (`prestamos/index`), 17 (`autorizar`), 21 (`tesorera`), 24 (`plan`, real o simulado por params) y resultados 19 `credito-autorizado` y 23 `prestamo-desembolsado`. Pasarela ampliada con `FlowKind` `credito` (`finishLoanRepaymentGrant`) y `desembolso` (pago del fondo). `tsc` y bundle ok; ciclo pedir → autorizar → aprobar → desembolsar → plan y rechazo probados contra `mockApi`. Para probar: entrar como `luz` (pide), luego `rosa.gomez` (tesorera aprueba).
  - Pendiente: botón «Ver el plan de pagos» de la 23 (la tesorera no tiene endpoint para el plan de otra persona; se dejó solo «Listo»). Tasa/amortización/periodo: se pintan como lleguen del back.
- 2026-10-16 ~12:50 — Carril reclamado por Henry (sesión C). Encargo en [docs/SESIONES-HENRY.md](docs/SESIONES-HENRY.md). Superado: otra sesión de Henry ya construyó el carril (ver línea siguiente).

### pitch
- 2026-10-16 ~12:45 — (Henry, otra sesión de Claude) Guion de 5 min y contexto con fuentes en [docs/pitch/](docs/pitch/); lo no respaldado por el repo va marcado [CONFIRMAR]. Faltan las slides en la plantilla oficial.
- 2026-10-16 ~13:10 (Henry) — Borrador de guion de otra sesión fusionado en [docs/pitch/GUION.md](docs/pitch/GUION.md) (canónico); el duplicado `docs/pitch-guion.md` se quitó.
- 2026-10-16 ~15:30 (Henry) — Página de preparación del pitch: [docs/pitch/preparacion.html](docs/pitch/preparacion.html) (ábrala en el navegador). Andrés ya queda «Al día» tras pagar (arreglo de `mockApi.ts` en la sesión de integración); las pantallas 11 y 34 coinciden en «sale 11,13 €» (cuota 11,00 € + costo 0,13 €), y así quedó en el guion.
- 2026-10-16 ~16:20 (Henry) — Presentación editable: [docs/pitch/presentacion.html](docs/pitch/presentacion.html) (9 diapositivas, capturas reales en `docs/pitch/pantallas/`, 5 temas para decidir, ✎ Editar, notas, PDF en `presentacion.pdf`). Recapturar con `scripts/capturar-pantallas.mjs`. Ideas de inclusión en [docs/pitch/ideas-inclusion.md](docs/pitch/ideas-inclusion.md). **Para quien tenga la pantalla 10:** el frasco se desborda con $200.000 (`pantallas/10-despues.png`).
- (vacío)
