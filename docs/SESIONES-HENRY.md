# Sesiones en paralelo de Henry (16–17 oct 2026)

> **Estado al 2026-10-16 ~13:50 (manda sobre lo de abajo):** la integración con Camilo está en [INTEGRACION-EXPO-GO.md](INTEGRACION-EXPO-GO.md). `feat/creditos` (fork de Henry) = `main` `32eb791` + pagos + seguridad + créditos 16–25 + Cognito, probada en demo. La sesión C ya no hace falta (créditos hecho). Sigue la sesión D (pulido en celular). Henry en persona: Expo Go contra Cognito real, Test Wallet, curso y slides con [pitch/GUION.md](pitch/GUION.md).

Plan de trabajo de Henry desde el viernes 16/10 ~13:00 hasta la entrega del sábado 17/10 a las 11:00. Rebasa los pendientes de [HENRY.md](HENRY.md) con el estado real de las ramas. El tablero vivo sigue en [MEMORY.md](../MEMORY.md).

## Estado de partida (verificado 2026-10-16 ~12:50)

| Rama | Qué tiene | Estado |
|---|---|---|
| `main` | `base` + `cuenta-natillera` (01–10, 15, 35) | En línea (`7f29e04`) |
| `feat/pagos` | 11, 12, 14, 26–28, 30–34 en demo **+ `main` ya fusionado** (merge `da44d32`) | `tsc` limpio, `expo export --platform web` ok, `ai-usage-check` ok. **Falta push** (con OK de Camilo) y el PR a `main` (lo abre Camilo) |
| `feat/creditos` | — | Por crear desde `feat/pagos` integrada |

Conflictos de la fusión resueltos como pide el plan: `AI_USAGE.md` con las filas de ambas ramas, `MEMORY.md` con la tabla de carriles de `main` y los dos pedidos entre carriles, y `prompts/2026-10-16-camilo.md` con las dos versiones concatenadas (ninguna descartada).

## Mapa de paralelismo

Cuatro frentes a la vez. Las dos sesiones de código no comparten archivos; los frentes humanos no dependen de código salvo H1.

| Frente | Quién | Rama / lugar | Archivos que toca | Depende de |
|---|---|---|---|---|
| **C · créditos** | Sesión de Claude Code (worktree `frontend-creditos`) | `feat/creditos` | `src/app/(tabs)/natillera/prestamos/*`, `src/features/creditos/*`, `src/app/resultado.tsx`, `src/app/billetera/volviendo.tsx`, `src/features/pagos/flow.ts` (solo `ResultKind`) | `feat/pagos` empujada |
| **D · pulido celular + copy** | Sesión de Claude Code (worktree `frontend-pulido`) | `feat/cuenta-celular` | Pantallas de `cuenta-natillera`, `package.json` (solo `expo-clipboard`), `docs/copy-henry.md` | `main` |
| **H · Henry en persona** | Henry | Celular, Test Wallet, Google Slides | `MEMORY.md` (bitácoras `pagos` y `pitch`) | H1 necesita `feat/pagos` |
| **P · pitch con Claude** | Este proyecto de claude.ai | Slides y guion | Nada del repo | Nada |

Reglas para no pisarse: C es la única sesión que toca `resultado.tsx` y `volviendo.tsx`; D es la única que toca `package.json`; ninguna toca `src/theme`, `src/api`, `src/components` ni `src/app/_layout.tsx` (eso se pide en "Pedidos entre carriles"). Cada sesión edita solo su bitácora en `MEMORY.md`.

## Paso a paso

### Paso 0 · Ya (15 min) — destrabar todo

1. Pedir a Camilo el OK para empujar `feat/pagos` con `main` fusionado.
2. Traer la fusión. Si la hiciste con el bundle que te entregó Claude:
   ```bash
   git fetch ./natillera-feat-pagos.bundle feat/pagos:feat/pagos-integrada
   git switch feat/pagos-integrada
   git log -2 --oneline   # el plan de sesiones y, debajo, da44d32 merge: main en feat/pagos
   ```
   Si no, repítela: `git switch feat/pagos && git merge main` y resuelve como está descrito arriba.
3. Con el OK: `git push origin feat/pagos-integrada:feat/pagos` y avisar a Camilo para el PR a `main`.
4. `git config user.name "Henry"` (el hook nombra los prompts con ese valor).
5. Crear los dos worktrees:
   ```bash
   git fetch origin
   git worktree add ../frontend-creditos -b feat/creditos origin/feat/pagos
   git worktree add ../frontend-pulido -b feat/cuenta-celular origin/main
   ```
6. Reclamar en la tabla de Carriles de `MEMORY.md`: `creditos` → Henry (sesión C), en curso.

### Paso 1 · 13:15–16:00 — arrancan los cuatro frentes

| Frente | Qué | Listo cuando |
|---|---|---|
| C | Pegar el encargo C (abajo) en una sesión de Claude Code abierta en `frontend-creditos` | 16 (pedir y simular) navegable en demo |
| D | Pegar el encargo D en una sesión abierta en `frontend-pulido` | `expo-clipboard` y botón volver probados; `docs/copy-henry.md` entregado |
| H1 | Probar 11 → 28 → 30 → 34 en Expo Go y en web con `EXPO_PUBLIC_USE_MOCKS=1 npx expo start` (en `feat/pagos`) | Recorrido sin errores; hallazgos en la bitácora `pagos` |
| H2 | Test Wallet: 3 cuentas (Doña Rosa, Luz, fondo), monedas disponibles (¿COP?), ¿acepta `natillera://retorno` como finish URI? | Respuestas en la bitácora `pagos` y aviso a Duvan |

### Paso 2 · 16:00–19:00

| Frente | Qué |
|---|---|
| C | 17 → 19 (autorizar cuotas y resultado), luego 20, 21, 25 |
| D | Si terminó: cerrar, `tsc` limpio, avisar a Camilo para merge a `main`; la sesión se libera |
| H3 | Curso de Platzi o Guide to Open Payments; marcar el checklist en `MEMORY.md` |
| H4 + P | Esqueleto de slides en la plantilla oficial (problema, solución, demo, impacto, equipo) |

**Punto de control 19:00:** `feat/creditos` hace `git merge origin/main`, `tsc` limpio, push con OK de Camilo.

### Paso 3 · 19:00–23:00

| Frente | Qué |
|---|---|
| C | 21 tesorera (aprobar/rechazar) → 23 desembolsado → 24 plan de pagos. Fin del carril en demo |
| H | Revisar créditos en celular con usuarios demo (Doña Rosa pide, entrar como tesorera para decidir) |
| P | Guion de 5 min sobre el camino del pitch |

**Punto de control 23:00:** PR de `feat/creditos` a `main` (lo abre Camilo).

### Paso 4 · Madrugada 23:00–06:00 (con Camilo)

1. Conectar al back real lo que esté listo (`EXPO_PUBLIC_API_URL`), empezando por la cuota (11 → 30 → 34) con las wallets de H2.
2. Grabar el pago real de punta a punta con la Test Wallet apenas funcione (es la prioridad oficial).
3. Préstamos contra el back en la medida en que existan los flujos 10–12B.

### Paso 5 · 06:00–11:00 — cierre

| Hora | Qué |
|---|---|
| 06:00–08:00 | APK en un Android real y **video de respaldo** (antes de las 08:00) |
| 08:00–10:00 | Slides finales, ensayo del pitch ×3, `node scripts/ai-usage-check.mjs` limpio, "What We Did Ourselves" completo |
| 10:00–11:00 | `main` congelado, repo público, link de demo en el Drive, formulario enviado |

## Encargo C · créditos (pegar en Claude Code, worktree `frontend-creditos`)

```
Eres la sesión C del front de Natillera sin Fronteras (carril `creditos`, rama `feat/creditos`, salida de `feat/pagos` ya integrada con `main`). Antes de nada lee CLAUDE.md, MEMORY.md, docs/SESIONES-HENRY.md, docs/figma-pantallas.md (+ docs/_figma_raw.txt para los textos exactos de 16–25) y "Cómo usar la base" en docs/HENRY.md. Reclama el carril en MEMORY.md.

Orden (todo en modo demo, con la API que ya existe: simulateLoan, requestLoan, startLoanRepaymentGrant, finishLoanRepaymentGrant, getMyLoans, listPendingLoanRequests, decideLoan; hooks useMyLoans y usePendingLoanRequests):
1. 16 Pedir préstamo en src/app/(tabs)/natillera/prestamos/index.tsx: monto, Choice 2/4/6 cuotas, "le llegaría" y plan con simulateLoan; "Pedir" → requestLoan → 17. La misma ruta muestra 20 (esperando a la tesorera) o 25 (rechazado) según useMyLoans().
2. 17 Autorizar el pago del crédito (prestamos/autorizar.tsx): startLoanRepaymentGrant → /billetera/antes con antesHref de src/features/pagos/flow.ts → openWallet → /billetera/volviendo. En volviendo.tsx añade la rama de préstamo (finishLoanRepaymentGrant) sin romper la de pagos.
3. 19 y 23: agrega 'credito-autorizado' y 'prestamo-desembolsado' a ResultKind en src/features/pagos/flow.ts y sus entradas en VARIANTS de src/app/resultado.tsx (TypeScript marca lo que falte).
4. 21 Tesorera (prestamos/tesorera.tsx): listPendingLoanRequests, aprobar/rechazar con decideLoan; si aprueba, desembolso → billetera → 23.
5. 24 Plan de pagos (prestamos/plan.tsx): cuotas capital + interés con estado pagada/pendiente/en mora, tal como lo devuelve getMyLoans (las tasas y la amortización NO las inventamos).

Reglas: lanza un agente Opus que valide y agentes ejecutores Sonnet; /ui-ux-pro-max antes de maquetar; solo useApi() y hooks de @/api; textos en "usted" del Figma; áreas táctiles ≥ 48 px y A+ al máximo; montos con formatAmount. Tus componentes en src/features/creditos/. NO edites src/theme, src/components, src/api, src/app/_layout.tsx ni package.json: pídelo en "Pedidos entre carriles" de MEMORY.md. Cada pantalla: npx tsc --noEmit + recorrido en web sin errores en consola. Commits pequeños con Co-Authored-By. Al cerrar cada bloque: fila en AI_USAGE.md (persona Henry) y línea en la bitácora `creditos` de MEMORY.md. NO merge a main ni push sin OK de Camilo. A las 19:00 haz git merge origin/main en tu rama y avísame.
Si necesitas hacerme preguntas, házmelas.
```

## Encargo D · pulido celular + copy (pegar en Claude Code, worktree `frontend-pulido`)

```
Eres la sesión D del front de Natillera sin Fronteras (rama `feat/cuenta-celular`, salida de `main`). Antes de nada lee CLAUDE.md, MEMORY.md, docs/SESIONES-HENRY.md y la bitácora `cuenta-natillera` de MEMORY.md.

Tareas, en orden:
1. "Copiar el enlace" de la invitación (pantalla 09): npx expo install expo-clipboard y copiar de verdad con un aviso corto "Enlace copiado"; Compartir queda como segunda opción.
2. Botón volver en las pantallas sueltas fuera de las pestañas (04 Su cuenta y las que se abren sin cabecera): que siempre haya cómo regresar, área táctil ≥ 48 px.
3. Revisión de textos de TODAS las pantallas contra docs/figma-pantallas.md: tono "usted", frases cortas, sin jerga financiera ni técnica. Entrega docs/copy-henry.md con una tabla (pantalla, texto actual, propuesta, por qué). No toques el Figma ni cambies textos en el código: es una propuesta para Camilo.

Reglas: no edites src/theme, src/api, src/components, src/app/_layout.tsx ni nada de src/app/(tabs)/natillera/prestamos, resultado.tsx o billetera/ (son de otras sesiones). Eres la única sesión que toca package.json. npx tsc --noEmit limpio y prueba en web. Commits pequeños con Co-Authored-By. Al cerrar: fila en AI_USAGE.md (persona Henry) y línea en la bitácora `cuenta-natillera` de MEMORY.md. NO merge a main ni push sin OK de Camilo.
```

## Mensaje para Camilo (copiar al chat del equipo)

> Camilo: hice la fusión de `main` en `feat/pagos` (docs concatenados como dice el plan; `tsc` limpio, export web ok, `ai-usage-check` ok). ¿Me das OK para hacer push a `feat/pagos` y abres el PR a `main`? Arranco ya `feat/creditos` desde ahí y una rama corta `feat/cuenta-celular` con `expo-clipboard` + botón volver + la propuesta de copy. Sigue pendiente tu decisión de `web.output` "server" → "single".
