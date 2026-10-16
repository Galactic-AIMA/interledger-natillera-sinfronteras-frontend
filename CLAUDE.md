# CLAUDE.md — Natillera sin Fronteras (frontend)

Instrucciones para cualquier sesión de Claude Code en este repo. Léelas completas antes de tocar código y luego lee [MEMORY.md](MEMORY.md) (tablero compartido entre sesiones).

## Qué es

App móvil de **Natillera sin Fronteras** para la Hackatón Open Payments de Interledger (Ruta N, Medellín, 16–17 oct 2026). Una natillera es un fondo de ahorro en familia: cada periodo todos ponen una cuota a una billetera común y el fondo les presta. "Sin fronteras": los socios viven en países distintos y pagan en su moneda con **Open Payments**.

- **Entrega: sábado 17/10 a las 11:00.** Después no se toca código. Pitch de 5 min con demo a las 12:00.
- Front (este repo): Henry y Camilo. Back (Lambda + API Gateway + Cognito + DynamoDB): Duvan y David Ciro, en https://github.com/duvanjaramillomarin/interterledger-natillera-sin-fronteras-backend
- Público objetivo: familias, muchos adultos mayores. Tono "usted", textos cortos, botón **A+** para agrandar la letra. Apuntamos al premio de inclusión financiera.

## Documentos de referencia

| Documento | Para qué |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Plan completo: reglas, arquitectura, carriles, cronograma, riesgos |
| [docs/HENRY.md](docs/HENRY.md) | Guía de Henry: tareas sin dependencia, orden de pantallas, reglas, cómo pedir cosas |
| [docs/figma-pantallas.md](docs/figma-pantallas.md) | Las 35 pantallas, endpoint de cada una, dueño y Paleta G |
| [docs/open-payments.md](docs/open-payments.md) | Resumen técnico de Open Payments y trampas |
| [docs/api-contrato.md](docs/api-contrato.md) | Contrato con el back (auth con Cognito ya confirmado por el back) |
| [docs/INTEGRACION-EXPO-GO.md](docs/INTEGRACION-EXPO-GO.md) | Rama de Henry lista para `main`, cambios en `src/api` y pruebas en Expo Go |
| [docs/estado-2026-10-16-tarde.md](docs/estado-2026-10-16-tarde.md) | **Estado más reciente** de front y back y lo que falta para la entrega, por prioridad |
| [docs/openapi.yaml](docs/openapi.yaml) | Contrato exacto de la API que llama la app (20 rutas, P0 marcadas) |
| [docs/COORDINACION-BACK.md](docs/COORDINACION-BACK.md) | Estado del back verificado, camino mínimo para el pago real, formatos JSON exactos y en qué ayuda el front |
| [docs/ENCARGO-SIGNUP-COGNITO.md](docs/ENCARGO-SIGNUP-COGNITO.md) | Encargo del registro directo a Cognito (hecho) |
| [docs/SESIONES-HENRY.md](docs/SESIONES-HENRY.md) | Reparto en sesiones paralelas de Henry y su estado |
| [docs/auditoria-2026-10-16.md](docs/auditoria-2026-10-16.md) · [docs/revision-codigo-2026-10-16.md](docs/revision-codigo-2026-10-16.md) · [docs/pruebas-2026-10-16.md](docs/pruebas-2026-10-16.md) | Auditoría de seguridad, revisión de código y pruebas del 16/10 |
| [docs/copy-henry.md](docs/copy-henry.md) | Propuesta de textos (tono "usted", sin jerga) |
| [docs/pitch/](docs/pitch/) | Guion de 5 min y contexto del pitch |
| Arquitectura del back | `docs/ARQUITECTURA.md` en la rama `david` del repo back (**fuente de verdad del back**) |
| Figma | https://www.figma.com/design/hK29vkj23AZZXEN7W2hjmA |

## Reglas no negociables

1. **La app nunca firma con Open Payments ni tiene llaves.** El SDK solo corre en Node: todo pasa por nuestra API. La app solo abre la URL de la billetera y vuelve por `natillera://retorno`.
2. Montos siempre `{ value: string, assetCode, assetScale }`. Formatear con `formatAmount`; nunca floats para lógica.
3. Las pantallas 13, 18, 22 y 29 son la **Test Wallet real**: no se construyen.
4. Toda pantalla funciona en **modo demo** (`mockApi`) y en modo real (`httpApi`); nunca llamar `fetch` directo desde una pantalla.
5. Ningún secreto en el repo, en `.env` versionado ni en un prompt (los prompts se publican).
6. Todo termina en `main` (regla de la hackatón). El repo es público.

## Documentar el uso de IA (obligatorio, lo revisa el jurado)

Política: https://interledger.org/hackathon/ai-policy/ — `AI_USAGE.md` en la raíz con herramientas, para qué y en qué archivos; prompts **literales** en `/prompts`.

- **Prompts de Claude Code:** se guardan solos con el hook `.claude/hooks/log-prompt.mjs` en `prompts/AAAA-MM-DD-<persona>-<rama>.md`. No lo desactives. La persona sale de `git config user.name` (o de la variable `NATILLERA_PERSONA`).
- **Otras herramientas** (ChatGPT, Copilot, Gemini, v0, Figma AI): pega el prompt literal en `prompts/<persona>-<herramienta>.md` en el momento.
- **Al cerrar cada tarea**, Claude agrega una fila a la tabla "Where and How We Used AI" de [AI_USAGE.md](AI_USAGE.md): fecha, persona, herramienta, qué se hizo, archivos.
- Commits asistidos con el trailer `Co-Authored-By: Claude …`.
- Antes de entregar: `node scripts/ai-usage-check.mjs` y completar "What We Did Ourselves".

## Trabajo en paralelo

- **Una sesión = un carril = una rama** `feat/<carril>-<tema>` salida de `main`, merge a `main` cada ~3 h. Reclama tu carril en [MEMORY.md](MEMORY.md) antes de empezar.
- Carriles: `base` (tema, componentes, `src/api`, navegación — Camilo), `cuenta-natillera` (pantallas 01–10, 15, 35 — Camilo, ya en `main`), `pagos` (11–14, 26–34) y `creditos` (16–25) — hechos en demo e integrados por Henry en `feat/creditos` (ver docs/INTEGRACION-EXPO-GO.md), `pitch`.
- Archivos compartidos (`src/theme`, `src/api`, `src/components`, `app/_layout.tsx`): solo el carril `base`. Si necesitas un cambio, anótalo en "Pedidos entre carriles" de MEMORY.md.
- MEMORY.md: cada carril edita solo su sección.

## Stack y convenciones

- Expo + Expo Router + TypeScript estricto (sin `any`, `as const` en vez de `enum`). TanStack Query para datos.
- `src/api/client.ts` define la interfaz; `httpApi.ts` (AWS) y `mockApi.ts` (Doña Rosa, Luz, Andrés) la implementan. `EXPO_PUBLIC_USE_MOCKS=1` o el botón "Empezar con datos de ejemplo" eligen el modo.
- Auth: Cognito directo por `fetch` (sin Amplify), `us-east-2`: `SignUp` para el registro (confirma al instante) e `InitiateAuth` para login y refresh; `AccessToken` en `Bearer`, tokens en `expo-secure-store`.
- Billetera: `WebBrowser.openAuthSessionAsync(redirectUrl, 'natillera://retorno')`; la pantalla 30 consulta `GET /payments/{id}` hasta un estado final.
- Diseño: Paleta G y tipografías Gloock / Hanken Grotesk / Martian Mono (ver `docs/figma-pantallas.md`). Usar `/ui-ux-pro-max` antes de maquetar. Áreas táctiles ≥ 48 px, contraste AA.
- Código en inglés; comentarios, commits y docs en español.
