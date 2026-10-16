# MEMORY.md — tablero compartido del frontend

Estado vivo. Cada sesión lo lee al empezar y actualiza **solo su sección** al terminar. Fechas y horas absolutas (hora de Colombia).

## Estado general

- 2026-10-16 — Repo vacío creado. Setup inicial: CLAUDE.md, MEMORY.md, AI_USAGE.md, hook de prompts, docs (Camilo + Claude Code).
- Entrega: **2026-10-17 11:00**. Grabar video de respaldo antes de las 08:00.

Plan completo: [docs/PLAN.md](docs/PLAN.md) · guía de Henry: [docs/HENRY.md](docs/HENRY.md)

## Carriles

| Carril | Alcance | Persona | Sesión / rama | Estado |
|---|---|---|---|---|
| `base` | Scaffold Expo, tema, componentes, `src/api` (+ mocks), auth, navegación | Camilo | main | **lista** (2026-10-16) |
| `cuenta-natillera` | Pantallas 01–10, 15, 35 | Camilo | — | libre |
| `pagos` | Pantallas 11–14, 26–34 (incluye retorno de billetera) | Henry | — | libre |
| `creditos` | Pantallas 16–25 | Henry (+ Camilo en la madrugada) | — | libre |
| `pitch` | Slides en la plantilla oficial, guion de 5 min, video | Camilo + Henry | — | libre |

## Decisiones tomadas

- 2026-10-16 — Expo + APK Android para la demo. **Por qué:** deep link de regreso de la billetera fiable y build rápido.
- 2026-10-16 — Contrato + mocks: el front no espera al back. **Por qué:** quedan menos de 24 h.
- 2026-10-16 — Las 31 pantallas propias navegables y todas conectadas al back (incluidos préstamos).
- 2026-10-16 — Login con Cognito (JWT). Pitch en español.

- 2026-10-16 — El contrato manda desde `docs/openapi.yaml` del repo back. Front solo con mocks hasta la madrugada. Las decisiones abiertas del back (IaC, JS/TS, periodo, tasa, amortización) las deciden Duvan y David Ciro; el front pinta lo que devuelvan.

## Propuestas al back (pendientes de respuesta)

1. `finish.uri` https del back que verifique el hash y responda 302 a `natillera://retorno?paymentId=…&result=…` (su flujo 4 manda `interact_ref` desde la app sin verificar el hash). El front soporta ambos.
2. Que "iniciar pago" devuelva también `debitAmount` y `receiveAmount` de la quote (pantallas 11, 16, 26, 28).
3. Endpoint demo `charge-now` para mostrar el cobro recurrente en vivo.
4. `GET /payments/{id}` para el polling de la pantalla 30.
5. Entrega en `main` (hoy usan `master`) y `AI_USAGE.md` + `/prompts` en la raíz de su repo (hoy tienen `docs/USO-IA.md`, que no cumple la política).

## Pedidos entre carriles

- 2026-10-16 · de base a pagos: Henry, empieza por la Parte A de [docs/HENRY.md](docs/HENRY.md) (wallets de prueba, monedas, `natillera://`, curso, slides). Camilo avisa aquí cuando `base` esté lista para que arranques las pantallas.
- 2026-10-16 · de base a todos: **`base` lista en `main`.** Ya pueden arrancar pantallas: cada ruta tiene un placeholder con su número; reemplácenlo completo. Guía rápida en "Cómo usar la base" de [docs/HENRY.md](docs/HENRY.md) y en la bitácora `base`.
- Formato: `AAAA-MM-DD HH:MM · de <carril> a <carril>: <qué>`

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

### cuenta-natillera
- (vacío)

### pagos
- (vacío)

### creditos
- (vacío)

### pitch
- (vacío)
