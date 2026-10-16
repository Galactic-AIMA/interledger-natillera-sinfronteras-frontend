# MEMORY.md — estado compartido entre sesiones

Memoria viva del backend. Cada sesión lee esto al empezar y actualiza **solo su sección** al
terminar. Fechas absolutas (YYYY-MM-DD). Reglas de uso en [CLAUDE.md](CLAUDE.md).

## Estado general

- 2026-10-16 — Repo creado por Duvan (`initial commit`: solo `app/package.json` con
  `@interledger/open-payments ^7.4.0`). Arquitectura final transcrita a
  [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Setup de CLAUDE.md / MEMORY.md / USO-IA subido a la rama `david`.
- Ramas: `master` (integración por PR), `duvdev` (la crea y maneja Duvan), `david` (David + sus
  sesiones de Claude; las sesiones salen de `david` con `feat/<carril>-...` y vuelven a `david`).

## Carriles de trabajo

| Carril | Alcance (flujos de docs/ARQUITECTURA.md) | Dueño de archivos compartidos | Equipo (duvdev / david) | Sesión | Estado |
|---|---|---|---|---|---|
| `infra` | Infra AWS manual / AWS CLI: API Gateway, Cognito, 9 tablas DynamoDB, Secrets Manager, EventBridge Scheduler | Definición de infra y tablas | david | — | libre |
| `op-core` | Capa compartida del cliente Open Payments (cliente autenticado, verificar wallet, incoming, quote, grants, continue, outgoing, rotate token) + utilidades de montos | Capa Open Payments, tipos de montos | duvdev | — | libre |
| `pagos` | Flujos 3 y 4 (start / finish payment), 5 y 6 (cuentas guardadas y pago a ellas) | — | duvdev | — | libre |
| `usuarios` | Flujos 1 y 2 (signup con verificación de wallet, login Cognito) y 13 (lecturas GET) | Middleware de auth (sub del token) | duvdev | — | libre |
| `natillera` | Flujos 7, 8, 9 (crear, unirse, aportar) | — | duvdev | — | libre |
| `credito` | Flujos 10, 11, 12, 12B (préstamos, recurrentes, cobro de cuotas) | — | duvdev | — | libre |

Orden sugerido: `infra` + `op-core` primero (desbloquean todo); `usuarios` en paralelo con
mocks; luego `pagos`, `natillera`, `credito`.

## Decisiones abiertas (del diagrama)

1. Periodo de la cuota recurrente: mensual (`P1M`) o quincenal (`P15D`), y número de repeticiones.
2. Tasa del préstamo (TEA): aparecen 2,7 %, 2 % mensual y 1 % quincenal.
3. Amortización (12B): capital fijo con cuota decreciente, o cuota fija. Qué pasa con la mora.
4. Integración API Gateway: Lambda proxy o VTL en los flujos que tocan Open Payments.
5. Canal de aviso a la administradora además de la lista en la app (SMS o Telegram).

Decisiones técnicas aún sin tomar:
- API Gateway: HTTP API (recomendado, authorizer JWT de Cognito) o REST API (necesario si se usa VTL).
- Región AWS: se propone `us-east-1`, un solo entorno para la hackathon.

## Decisiones tomadas

- 2026-10-16 · Lenguaje: **TypeScript**.
- 2026-10-16 · **Sin herramienta de IaC** (ni CDK, SAM, Terraform). La infra AWS se crea a mano en
  la consola siguiendo [docs/AWS-SETUP.md](docs/AWS-SETUP.md); más adelante se automatiza con
  scripts de **AWS CLI**.
- 2026-10-16 · Reparto: **Duvan escribe el código de las Lambdas** (rama `duvdev`); **David monta
  y opera la infra AWS** (rama `david`), porque Duvan no tiene acceso a AWS por ahora.

## Pedidos entre carriles

- (vacío) — formato: `YYYY-MM-DD · de <carril> a <carril>: <qué se necesita>`

## Bitácora por carril

### infra
- 2026-10-16 · Guía de montaje manual en [docs/AWS-SETUP.md](docs/AWS-SETUP.md). Avance paso a
  paso en la tabla "Estado" de esa guía (IDs y ARNs que no son secretos van ahí).

### op-core
- (vacío)

### pagos
- (vacío)

### usuarios
- (vacío)

### natillera
- (vacío)

### credito
- (vacío)
