# Uso de IA en Natillera sin Fronteras

Bitácora del uso de herramientas de IA durante la hackathon. Una entrada por sesión de trabajo,
la más reciente arriba. Ver reglas en [CLAUDE.md](../CLAUDE.md#documentar-el-uso-de-ia-obligatorio).

## Plantilla

```markdown
### YYYY-MM-DD · <carril> · <persona>
- **Herramienta / modelo:** p. ej. Claude Code (Claude Opus 5.5)
- **Qué se pidió:** ...
- **Qué produjo la IA:** archivos, PR, decisiones propuestas
- **Revisión humana:** qué se verificó, corrigió o descartó
- **Rama / PR:** ...
```

## Resumen de herramientas usadas

| Herramienta | Modelo | Para qué |
|---|---|---|
| Claude Code (app de escritorio) | Claude Opus 5.5 | Setup del repo, documentación, desarrollo del backend en sesiones paralelas |

## Entradas

### 2026-10-16 · infra · David Ciro
- **Herramienta / modelo:** Claude Code (Claude Opus 5.5)
- **Qué se pidió:** guía para montar a mano en la consola de AWS la infra de la arquitectura
  (sin IaC; más adelante con AWS CLI), y registrar las decisiones de TypeScript y del reparto.
- **Qué produjo la IA:** `docs/AWS-SETUP.md` (pasos 0–8: cuenta, Test Wallet, Secrets Manager,
  Cognito, 9 tablas DynamoDB, rol IAM con política de mínimo privilegio, Lambdas, HTTP API con
  authorizer JWT, EventBridge Scheduler); actualizó `MEMORY.md` y `CLAUDE.md`.
- **Revisión humana:** David ejecuta cada paso en la consola y marca el estado en la guía.
- **Rama / PR:** `feat/infra-aws-setup` → `david`

### 2026-10-16 · setup · David Ciro
- **Herramienta / modelo:** Claude Code (Claude Opus 5.5)
- **Qué se pidió:** clonar el repo, leer la arquitectura (draw.io, página 3) y la doc de Open
  Payments, y preparar el repo para trabajar con varias sesiones de IA en paralelo.
- **Qué produjo la IA:** extrajo el contenido del draw.io desde Google Drive y lo transcribió a
  `docs/ARQUITECTURA.md`; creó `CLAUDE.md` (reglas para las sesiones), `MEMORY.md` (carriles de
  trabajo, decisiones abiertas, bitácora) y este archivo.
- **Revisión humana:** pendiente — validar con Duvan la división en carriles.
- **Rama / PR:** `david`
