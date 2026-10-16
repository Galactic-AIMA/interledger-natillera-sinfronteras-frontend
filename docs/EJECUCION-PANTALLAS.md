# Ejecución de pantallas (16–17 oct 2026)

Plan para construir las 31 pantallas sobre la base que ya está en `main`. Lo leen las sesiones de Claude que construyen pantallas y Henry. El contexto general está en [CLAUDE.md](../CLAUDE.md), el tablero en [MEMORY.md](../MEMORY.md) y la guía de componentes en "Cómo usar la base" de [HENRY.md](HENRY.md).

## Decisiones de Camilo (2026-10-16, tarde)

| Tema | Decisión |
|---|---|
| Reparto | 2 sesiones de Claude en paralelo, cada una en su worktree y su rama: `feat/cuenta-natillera` y `feat/pagos`. Henry prueba en celular, revisa textos y hace las slides |
| Prioridad | **El camino del pitch primero**: el pago de la cuota de punta a punta en modo demo, grabable ya |
| Nivel visual | Pulido en el camino del pitch (01, 10, 11, 28, 34): ilustración del frasco y el camino del año, microanimaciones sutiles. El resto, limpio y fiel al boceto con la Paleta G |
| Android | Celular real con Expo Go para iterar ya + emulador de Android Studio instalándose aparte como respaldo |

## Camino del pitch (lo primero que debe funcionar)

01 Bienvenida → 03 Entrar (o "datos de ejemplo") → 10 Mi natillera → 11 Poner la cuota → 28 Antes de la billetera → billetera (demo: diálogo) → 30 Volviendo → 34 Cuota puesta → 10 con el aporte en "Lo último que pasó".

## Sesión A · `cuenta-natillera` (rama `feat/cuenta-natillera`)

| Orden | Pantallas | Notas |
|---|---|---|
| 1 | **10 Mi natillera** (pulida) | Ilustración SVG "frasco + camino del año" (`react-native-svg`), fondo, su ahorro, estado, botón "Poner la cuota" → `/natillera/cuota`, filas ¿Quién pone? y Préstamos, "Lo último que pasó" |
| 2 | **01 Bienvenida** (pulir) y **03 Entrar** | 01 ya existe: ilustración de alcancía y entrada suave. 03 con `useApiContext().login` |
| 3 | 05 Sin natillera · 06 Lo invitaron | Misma ruta que 10 (`/natillera`): elige estado según `useMyNatillera()` |
| 4 | 02 Crear cuenta · 08 Crear natillera · 09 Invitación (QR) · 07 Tengo una invitación | Verificar billetera con `api.verifyWallet`. QR con `react-native-svg` (si hace falta librería, `npx expo install react-native-qrcode-svg`) |
| 5 | 15 ¿Quién pone? · 04 Su cuenta · 35 Ayuda | 04: en modo demo, selector de usuario (Doña Rosa, Luz, Andrés) con `demoUsers`; 35: respuestas fijas |

Dueña de los archivos compartidos (`src/theme`, `src/components`, `src/api`, `src/app/_layout.tsx`): si la sesión B necesita algo ahí, lo pide en "Pedidos entre carriles".

## Sesión B · `pagos` (rama `feat/pagos`)

| Orden | Pantallas | Notas |
|---|---|---|
| 1 | **11 Poner la cuota** (pulida) | ¿A nombre de quién? (`Choice`), resumen con `api.previewQuote`, "Poner la cuota" → `startPayment` → 28 |
| 2 | **28 Antes de la billetera** (pulida) · **30 Volviendo** · **34 Cuota puesta** (pulida) · 31 Pago hecho · 32 Rechazado · 33 Algo falló | 28 recibe `paymentId`, `redirectUrl` y montos por params y llama `openWallet`; 30 llama `finishPayment` + `waitForFinalPayment` y redirige a `/resultado` con el tipo; `resultado` pinta 31–34 con `ResultScreen`. Invalidar `keys.natillera` y `keys.payments` al terminar |
| 3 | 26 Pagar · 27 Guardar cuenta | Reutiliza 28 → 30 → 31 |
| 4 | 12 Pagos recurrentes · 14 Cuota automática activada | `startRecurring` → `openWallet` → `finishRecurring`; botón de demo "Cobrar ahora" con `chargeRecurringNow` |
| 5 | Préstamos 16, 17, 19, 20, 21, 23, 24, 25 | Si la sesión A termina antes, los toma ella (rama `feat/creditos`) |

Componentes propios de la sesión B: en `src/features/pagos/`. Los de la sesión A: en `src/features/natillera/`. Así no se pisan.

## Reglas para ambas sesiones

| Regla | Detalle |
|---|---|
| Arranque | `npm install` en el worktree; `npx expo start` y abrir en el celular con Expo Go (QR) o `npm run web` |
| Diseño | `/ui-ux-pro-max` antes de maquetar; textos exactos de [figma-pantallas.md](figma-pantallas.md); tono "usted"; áreas táctiles ≥ 48 px; probar con A+ al máximo |
| Datos | Solo `useApi()` y los hooks de `@/api`; toda pantalla funciona en modo demo |
| Animación | `react-native-reanimated` (ya instalado), 150–300 ms, nada decorativo que estorbe; respetar "reducir movimiento" |
| Verificación por pantalla | `npx tsc --noEmit` limpio + recorrido en web o celular sin errores en consola |
| Uso de IA | El hook guarda los prompts solo; al cerrar cada pantalla o bloque, fila en `AI_USAGE.md` y línea en la bitácora del carril en `MEMORY.md` |
| Git | Commits pequeños en su rama con el trailer `Co-Authored-By`. **Merge a `main` y push solo con OK de Camilo**, cada ~3 h o al terminar el camino del pitch |

## Hitos

| Hora (aprox.) | Hito |
|---|---|
| 16/10 ~18:00 | Camino del pitch completo en modo demo (A: 01, 03, 10 · B: 11, 28, 30, 34) → merge a `main` y primer video de prueba |
| 16/10 ~23:00 | Las 2 sesiones terminan sus carriles; préstamos en curso |
| 17/10 ~03:00 | Conexión al back real en lo que esté listo (`EXPO_PUBLIC_API_URL`) |
| 17/10 06:00–08:00 | APK (EAS Build o build local), prueba en celular y **video final** |
| 17/10 08:00–11:00 | Congelar `main`, `node scripts/ai-usage-check.mjs`, README y formulario |
