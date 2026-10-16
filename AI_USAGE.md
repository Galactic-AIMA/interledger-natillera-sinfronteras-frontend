# AI Usage · Natillera sin Fronteras (frontend)

Declaración de uso de IA según la política de la hackatón (https://interledger.org/hackathon/ai-policy/). Se actualiza durante todo el evento: cada tarea asistida agrega una fila y cada prompt queda literal en [`/prompts`](prompts/).

## Tools Used

| Herramienta | Modelo | Quién | Para qué |
|---|---|---|---|
| Claude Code (app de escritorio) | Claude Opus 5.5 | Camilo | Investigación de Open Payments, lectura de Figma y del diagrama de arquitectura, planeación, documentación, código del front |
| Claude Code · subagentes (sesiones A y B de pantallas) | Claude Sonnet 5.5 (ejecutores) y Claude Opus 5.5 (validador) | Camilo | Construir y validar las pantallas de `cuenta-natillera` y `pagos` en paralelo |
| Claude Code · sesión de auditoría | Claude Sonnet 5.5 | Camilo | Revisar sesiones, ramas, memoria y prompts; documentar el traspaso a Henry |
| Figma MCP (vía Claude Code) | — | Camilo | Leer los bocetos de Figma (textos y estructura de las 35 pantallas) |
| Claude (claude.ai con herramientas de código y subagentes) | Claude Opus 5.5 (subagentes: Sonnet 5.5 y Opus 5.5) | Henry | Revisión del repo, auditoría de verificación, pruebas, coordinación y ciberseguridad del carril `pagos`, y sus arreglos |
| Claude (claude.ai, proyecto del equipo, con acceso al equipo de Henry) | Claude Opus 5.5 | Henry | Revisión de pendientes, integración de ramas, plan de sesiones paralelas, registro Cognito, recorridos automáticos de la app en modo demo (Playwright manejado por la IA), documentación de integración; también ejecutó en el equipo de Henry scripts de git para subir ramas a su fork |

(Agregar aquí cualquier otra herramienta que use el equipo: ChatGPT, Copilot, Gemini, Figma AI…)

## Where and How We Used AI

| Fecha | Persona | Herramienta | Qué se hizo | Archivos |
|---|---|---|---|---|
| 2026-10-16 | Camilo | Claude Code | Investigación de la documentación de Open Payments, el SDK y las reglas de la hackatón; resumen técnico | `docs/open-payments.md` |
| 2026-10-16 | Camilo | Claude Code + Figma MCP | Inventario de las 35 pantallas de Figma con sus textos, endpoints y Paleta G | `docs/figma-pantallas.md`, `docs/_figma_raw.txt` |
| 2026-10-16 | Camilo | Claude Code | Borrador del contrato front ↔ back a partir del diagrama del back | `docs/api-contrato.md` |
| 2026-10-16 | Camilo | Claude Code | Contexto para sesiones paralelas y tablero del equipo | `CLAUDE.md`, `MEMORY.md` |
| 2026-10-16 | Camilo | Claude Code | Plan del equipo y guía de delegación para Henry (carriles, orden de pantallas, tareas sin dependencia) | `docs/PLAN.md`, `docs/HENRY.md`, `CLAUDE.md`, `MEMORY.md` |
| 2026-10-16 | Camilo | Claude Code | Sistema de registro de uso de IA: hook de prompts y script de verificación | `.claude/settings.json`, `.claude/hooks/log-prompt.mjs`, `scripts/ai-usage-check.mjs`, `AI_USAGE.md` |
| 2026-10-16 | Camilo | Claude Code | Scaffold con `create-expo-app` (SDK 58, plantilla default) ejecutado por la IA; se quitó el código de ejemplo y se dejó una base mínima con la Paleta G | `package.json`, `app.json`, `tsconfig.json`, `assets/`, `src/app/`, `src/theme/colors.ts`, `.gitignore`, `.vscode/`, `AGENTS.md` (los tres últimos vienen de la plantilla de Expo) |
| 2026-10-16 | Camilo | Claude Code (+ skill ui-ux-pro-max) | Carril `base`: tokens de diseño, fuentes, escala A+, componentes compartidos, capa de datos (interfaz, mock en memoria, cliente HTTP, login Cognito, apertura de billetera), navegación con pestañas y placeholders de las 31 pantallas; guía de uso para Henry | `src/theme/`, `src/components/`, `src/api/`, `src/utils/money.ts`, `src/app/`, `.env.example`, `.gitattributes`, `docs/HENRY.md`, `docs/api-contrato.md`, `MEMORY.md` |
| 2026-10-16 | Camilo | Claude Code | Plan de ejecución de pantallas por sesiones paralelas, a partir de las respuestas de Camilo | `docs/EJECUCION-PANTALLAS.md`, `MEMORY.md` |
| 2026-10-16 | Camilo | Claude Code (Sonnet 5.5 ejecutores + Opus validador) | Pantallas del carril cuenta-natillera: 01 Bienvenida, 03 Entrar, 10 Mi natillera (frasco + camino del año), 05/06/07 (invitaciones), 02/08/09 (cuenta, crear natillera, QR), 15, 04, 35; dependencia `react-native-qrcode-svg`; ajustes tras validación (acceso a Su cuenta, `resetQueries` al cambiar de usuario demo) | `src/app/(auth)/*`, `src/app/(tabs)/natillera/*`, `src/app/(tabs)/ayuda.tsx`, `src/app/cuenta.tsx`, `src/features/**`, `src/components/Screen.tsx`, `src/api/ApiProvider.tsx`, `src/api/mockApi.ts`, `package.json` |
| 2026-10-16 | Camilo | Claude Code | Encargos (prompts) para las sesiones paralelas de pantallas y del emulador; worktrees por rama; hook de prompts con la rama en el nombre; prompts de la sesión paralela recuperados literalmente de su transcripción local | `prompts/`, `.claude/hooks/log-prompt.mjs`, `MEMORY.md`, `CLAUDE.md` |
| 2026-10-16 | Camilo | Claude Code (sesión aparte) | Instalación del Android SDK y emulador en el equipo de Camilo para probar la app (no toca el código) | — |
| 2026-10-16 | Camilo | Claude Code (Sonnet 5.5) | Auditoría de las 5 sesiones, los 3 worktrees y los prompts: tablero y memoria al día, sección de pendientes de Henry, registro de los prompts que el hook no capturó (sesiones abiertas en la raíz); verificación de que `feat/pagos` choca con `main` en documentación | `MEMORY.md`, `CLAUDE.md`, `docs/HENRY.md`, `AI_USAGE.md`, `prompts/2026-10-16-camilo-auditoria.md` |
| 2026-10-16 | Camilo | Claude Code (agentes Sonnet ejecutores + Opus validador) | Carril `pagos`: pantallas 11, 28, 30, resultado (14, 31–34), 26, 27 y 12 con modo demo; contrato del flujo; validación y correcciones; fallback de billetera demo en web | `src/features/pagos/`, `src/app/(tabs)/natillera/cuota.tsx`, `src/app/(tabs)/natillera/recurrente.tsx`, `src/app/(tabs)/pagar/`, `src/app/billetera/`, `src/app/resultado.tsx`, `src/api/wallet.ts` |
| 2026-10-16 | Henry | Claude (claude.ai) + subagentes Sonnet 5.5 (verificación, pruebas) y Opus 5.5 (coordinación, ciberseguridad) | Auditoría del carril `pagos` y arreglos de seguridad: registro de flujos en memoria, validación de la URL de la billetera, resultados confirmados, `safeOrigin`, mensajes ante error de red, atrás en Android | `src/features/pagos/flow.ts`, `src/app/billetera/antes.tsx`, `src/app/billetera/volviendo.tsx`, `src/app/resultado.tsx`, `docs/auditoria-2026-10-16.md`, `MEMORY.md` |
| 2026-10-16 | Henry | Claude (claude.ai, Claude Opus 5.5) | Integración de `main` + `feat/pagos` en `feat/creditos` (resolución de choques en docs) y carril `creditos`: pantallas 16, 17, 20, 21, 24, 25 y resultados 19/23; pasarela ampliada a crédito y desembolso | `src/app/(tabs)/natillera/prestamos/*`, `src/features/creditos/links.ts`, `src/features/pagos/flow.ts`, `src/app/billetera/antes.tsx`, `src/app/billetera/volviendo.tsx`, `src/app/resultado.tsx`, `MEMORY.md`, `AI_USAGE.md`, `prompts/2026-10-16-camilo.md` |
| 2026-10-16 | Henry | Claude (claude.ai) | Revisión de pendientes y ramas; fusión de `main` en `feat/pagos` resolviendo los conflictos de documentación (concatenando prompts); verificación con `tsc`, export web y `ai-usage-check`; plan de sesiones paralelas C/D/H/P con encargos y mensaje para Camilo; tablero al día | `AI_USAGE.md`, `MEMORY.md`, `prompts/2026-10-16-camilo.md`, `docs/SESIONES-HENRY.md`, `docs/HENRY.md`, `prompts/2026-10-16-henry-claude-ai.md` |
| 2026-10-16 | Henry | Claude (claude.ai) | Registro directo a Cognito (SignUp) alineado con el mensaje del back y el encargo de Camilo: función `signUp`, mapeo de atributos, mensajes de error en "usted", validación de teléfono y contraseña en la pantalla 02, contrato y `.env.example` al día | `src/api/auth.ts`, `src/api/httpApi.ts`, `src/api/types.ts`, `src/app/(auth)/crear-cuenta.tsx`, `.env.example`, `docs/api-contrato.md`, `MEMORY.md` |
| 2026-10-16 | Henry | Claude (claude.ai) | Integración de la rama de créditos y auditoría de la otra sesión de Henry con `feat/pagos` y el `main` de Camilo (`32eb791`); choques de documentación resueltos conservando todo (prompts de Camilo verificados línea por línea) | `AI_USAGE.md`, `MEMORY.md`, `prompts/` |
| 2026-10-16 | Henry | Claude (claude.ai) | Recorridos automáticos en web (Playwright escrito y corrido por la IA) del modo demo: pitch, préstamos 16–24, pagar 26→31, recurrente 12→14 y validaciones de la 02; arreglo del botón «Volver a Préstamos» en la 21 que dejaba atrapada a la tesorera después de la 23 | `src/app/(tabs)/natillera/prestamos/tesorera.tsx` |
| 2026-10-16 | Henry | Claude (claude.ai) | Registro en modo real: verificación de billetera sin sesión contra la dirección de pago pública de Open Payments (antes la 02 no podía registrar a nadie); token vencido sin refresh se descarta | `src/api/httpApi.ts`, `src/api/auth.ts` |
| 2026-10-16 | Henry | Claude (claude.ai) | Repo ordenado para la integración: guía de Expo Go para Camilo, entregables de la otra sesión llevados a `docs/` (revisión de textos, pruebas, revisión de código, guion y contexto del pitch), índice de documentos, tablero y uso de IA al día | `docs/INTEGRACION-EXPO-GO.md`, `docs/copy-henry.md`, `docs/pruebas-2026-10-16.md`, `docs/revision-codigo-2026-10-16.md`, `docs/pitch/`, `docs/SESIONES-HENRY.md`, `CLAUDE.md`, `MEMORY.md`, `AI_USAGE.md` |
| 2026-10-16 | Henry | Claude (claude.ai) | Pulido para celular: «Copiar el enlace» real con `expo-clipboard` en la 09 (Compartir como segunda opción), botón «Volver» reutilizable en las 13 pantallas apiladas (iPhone no tiene atrás del sistema), los cinco cambios de texto de más impacto de `copy-henry.md` y aviso de espera en la 30; recorridos de prueba repetidos | `src/features/navegacion/BackButton.tsx`, `src/app/**` (02, 03, 04, 07, 08, 09, 11, 12, 15, 16–24, 27, 28, 30, 35, resultado), `src/features/pagos/recurrente/PasosRecurrente.tsx`, `package.json`, `package-lock.json`, `docs/copy-henry.md` |

## What We Did Ourselves

- Idea del producto, reglas de la natillera y bocetos de las 35 pantallas en Figma (equipo). *Por confirmar: si los bocetos usaron IA.*
- Arquitectura del backend en draw.io (equipo back).
- Decisiones de alcance, stack, autenticación y reparto del trabajo (Camilo y equipo, respondiendo preguntas de la IA).
- Revisión humana de todo lo generado antes de cada commit.
- Henry: decidió alinear el registro con el mensaje del back sobre Cognito «al pie de la letra», el orden de integración (una rama `feat/creditos` para el PR) y dio el OK para subir a su fork; Camilo dio el OK y redactó el encargo de Cognito.
- Mensaje de autenticación con Cognito (endpoint, cuerpos y errores): lo escribió el equipo back.

(Al cerrar: listar aquí los archivos hechos con poca o ninguna IA.)

## Prompt Log

- Automático: el hook `UserPromptSubmit` de Claude Code (`.claude/hooks/log-prompt.mjs`) guarda cada prompt literal en `prompts/AAAA-MM-DD-<persona>-<rama>.md`, con hora de Colombia y la sesión. Antes de escribir, tapa llaves privadas, API keys y tokens.
- Manual: los prompts de otras herramientas van en `prompts/<persona>-<herramienta>.md`.
- Sesión de planeación (antes del hook): [`prompts/2026-10-16-camilo-planeacion.md`](prompts/2026-10-16-camilo-planeacion.md).
- Sesión paralela de planeación (sin hook, recuperada de su transcripción): [`prompts/2026-10-16-camilo-sesion-paralela-plan.md`](prompts/2026-10-16-camilo-sesion-paralela-plan.md).
- Sesión de auditoría (raíz, sin hook): [`prompts/2026-10-16-camilo-auditoria.md`](prompts/2026-10-16-camilo-auditoria.md). Incluye la nota sobre los dos mensajes de solo imagen (capturas de pantalla del emulador) de la sesión del emulador, que no tienen texto.
- Encargos enviados a otras sesiones: [`prompts/2026-10-16-camilo-encargos-sesiones.md`](prompts/2026-10-16-camilo-encargos-sesiones.md).
- Sesiones de Henry en claude.ai (sin hook, copiadas a mano): [`prompts/2026-10-16-henry-claude-ai.md`](prompts/2026-10-16-henry-claude-ai.md). Los encargos a los subagentes de la auditoría se resumen en [`docs/auditoria-2026-10-16.md`](docs/auditoria-2026-10-16.md).
