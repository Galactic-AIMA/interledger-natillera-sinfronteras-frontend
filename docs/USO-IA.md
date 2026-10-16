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

### 2026-10-16 · setup · David Ciro
- **Herramienta / modelo:** Claude Code (Claude Opus 5.5)
- **Qué se pidió:** clonar el repo, leer la arquitectura (draw.io, página 3) y la doc de Open
  Payments, y preparar el repo para trabajar con varias sesiones de IA en paralelo.
- **Qué produjo la IA:** extrajo el contenido del draw.io desde Google Drive y lo transcribió a
  `docs/ARQUITECTURA.md`; creó `CLAUDE.md` (reglas para las sesiones), `MEMORY.md` (carriles de
  trabajo, decisiones abiertas, bitácora) y este archivo.
- **Revisión humana:** pendiente — validar con Duvan la división en carriles.
- **Rama / PR:** `david`
