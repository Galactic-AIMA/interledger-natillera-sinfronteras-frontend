# AI Usage · Natillera sin Fronteras (frontend)

Declaración de uso de IA según la política de la hackatón (https://interledger.org/hackathon/ai-policy/). Se actualiza durante todo el evento: cada tarea asistida agrega una fila y cada prompt queda literal en [`/prompts`](prompts/).

## Tools Used

| Herramienta | Modelo | Quién | Para qué |
|---|---|---|---|
| Claude Code (app de escritorio) | Claude Opus 5.5 | Camilo | Investigación de Open Payments, lectura de Figma y del diagrama de arquitectura, planeación, documentación, código del front |
| Figma MCP (vía Claude Code) | — | Camilo | Leer los bocetos de Figma (textos y estructura de las 35 pantallas) |

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
| 2026-10-16 | Camilo | Claude Code | Scaffold con `create-expo-app` (SDK 58, plantilla default) ejecutado por la IA; se quitó el código de ejemplo y se dejó una base mínima con la Paleta G | `package.json`, `app.json`, `tsconfig.json`, `assets/`, `src/app/`, `src/theme/colors.ts` |

## What We Did Ourselves

- Idea del producto, reglas de la natillera y bocetos de las 35 pantallas en Figma (equipo). *Por confirmar: si los bocetos usaron IA.*
- Arquitectura del backend en draw.io (equipo back).
- Decisiones de alcance, stack, autenticación y reparto del trabajo (Camilo y equipo, respondiendo preguntas de la IA).
- Revisión humana de todo lo generado antes de cada commit.

(Al cerrar: listar aquí los archivos hechos con poca o ninguna IA.)

## Prompt Log

- Automático: el hook `UserPromptSubmit` de Claude Code (`.claude/hooks/log-prompt.mjs`) guarda cada prompt literal en `prompts/AAAA-MM-DD-<persona>.md`, con hora de Colombia y la sesión. Antes de escribir, tapa llaves privadas, API keys y tokens.
- Manual: los prompts de otras herramientas van en `prompts/<persona>-<herramienta>.md`.
- Sesión de planeación (antes del hook): [`prompts/2026-10-16-camilo-planeacion.md`](prompts/2026-10-16-camilo-planeacion.md).
