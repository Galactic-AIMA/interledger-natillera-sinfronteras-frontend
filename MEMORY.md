# MEMORY.md — tablero compartido del frontend

Estado vivo. Cada sesión lo lee al empezar y actualiza **solo su sección** al terminar. Fechas y horas absolutas (hora de Colombia).

## Estado general

- 2026-10-16 — Repo vacío creado. Setup inicial: CLAUDE.md, MEMORY.md, AI_USAGE.md, hook de prompts, docs (Camilo + Claude Code).
- Entrega: **2026-10-17 11:00**. Grabar video de respaldo antes de las 08:00.

Plan completo: [docs/PLAN.md](docs/PLAN.md) · guía de Henry: [docs/HENRY.md](docs/HENRY.md)

## Carriles

| Carril | Alcance | Persona | Sesión / rama | Estado |
|---|---|---|---|---|
| `base` | Scaffold Expo, tema, componentes, `src/api` (+ mocks), auth, navegación | Camilo; **Henry a cargo mientras Camilo descansa (desde 2026-10-16 ~12:45)** | `feat/creditos` | lista; arreglos de seguridad aplicados |
| `cuenta-natillera` | Pantallas 01–10, 15, 35 | Camilo (sesión A) | `feat/cuenta-natillera` · worktree `frontend-cuenta` | **en `main`** (`ffd9917`, 2026-10-16); falta probar en celular |
| `pagos` | Pantallas 11–14, 26–34 (incluye retorno de billetera) | Camilo (sesión B) → traspaso a Henry | `feat/pagos` + arreglos de seguridad de Henry, integrados en `feat/creditos` | hecha en demo; falta celular y Test Wallet |
| `creditos` | Pantallas 16–25 | Henry (+ Camilo en la madrugada) | `feat/creditos` (desde `main` con `pagos` integrado) | **hecha en demo** (2026-10-16 ~13:20); falta celular y back |
| `pitch` | Slides en la plantilla oficial, guion de 5 min, video | Camilo + Henry | — | libre |

## Decisiones tomadas

- 2026-10-16 — Expo + APK Android para la demo. **Por qué:** deep link de regreso de la billetera fiable y build rápido.
- 2026-10-16 — Contrato + mocks: el front no espera al back. **Por qué:** quedan menos de 24 h.
- 2026-10-16 — Las 31 pantallas propias navegables y todas conectadas al back (incluidos préstamos).
- 2026-10-16 — Login con Cognito (JWT). Pitch en español.

- 2026-10-16 — El contrato manda desde `docs/openapi.yaml` del repo back. Front solo con mocks hasta la madrugada. Las decisiones abiertas del back (IaC, JS/TS, periodo, tasa, amortización) las deciden Duvan y David Ciro; el front pinta lo que devuelvan.

- 2026-10-16 — Ejecución de pantallas: 2 sesiones en paralelo (`feat/cuenta-natillera`, `feat/pagos`), camino del pitch primero, pulido solo en 01/10/11/28/34, celular con Expo Go + emulador de respaldo. Plan: [docs/EJECUCION-PANTALLAS.md](docs/EJECUCION-PANTALLAS.md).

## Propuestas al back (pendientes de respuesta)

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
- Formato: `AAAA-MM-DD HH:MM · de <carril> a <carril>: <qué>`
- ~~2026-10-16 12:45 · de pagos a base: 4 arreglos en archivos compartidos~~ **Hecho por Henry 13:00 (Camilo descansando)**: (logout con `RevokeToken`, errores no-JSON en `httpApi`, `.gitignore` con `.env*`, patrones del hook). Lista en [docs/auditoria-2026-10-16.md](docs/auditoria-2026-10-16.md).
- 2026-10-16 12:45 · de pagos a back (Camilo, reenviar a Duvan y David): el back aún no tiene código y sus rutas tentativas no cuadran con el contrato. Prioridad: `GET /payments/{id}` → `returnUrl` (lista blanca) y `debitAmount`/`receiveAmount` al iniciar → `charge-now`. Opción B con hash obligatorio; ignorar `result` del cliente; `natilleraId`. Detalle en el mismo doc.

## Pendientes para Henry (2026-10-16 ~12:40)

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

- 2026-10-16 ~13:00 (Henry, cubriendo a Camilo) — Arreglos de la auditoría en archivos compartidos: `auth.ts` revoca el refresh token en Cognito al salir (y tolera respuestas no JSON); `httpApi.ts` ya no revienta con HTML/502 y muestra mensajes en «usted» por status en vez del `message` crudo del back; `.gitignore` ignora `.env*` salvo `.env.example`; el hook tapa `clave`/`pwd`/`pass`/`access_token`, secretos AWS sin etiqueta y cadenas largas (probado: no toca URLs ni hashes de commit). `tsc` ok.

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
- (vacío)

### pitch
- (vacío)
