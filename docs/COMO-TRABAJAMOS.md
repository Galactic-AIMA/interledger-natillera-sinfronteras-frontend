# Cómo trabajamos

Cómo se organizó el equipo para construir Natillera sin Fronteras en menos de 24 horas (hackatón Open Payments, 16–17 oct 2026), con cuatro personas y varias sesiones de IA en paralelo. Sirve de base para la próxima app.

Equipo: Camilo (coordinación y front base), Henry (front y documentación), Duvan y David Ciro (back en AWS).

## 1. Arquitectura y reglas del producto

| Capa | Qué usamos | Regla |
|---|---|---|
| App | Expo + Expo Router + TypeScript estricto, TanStack Query | Toda pantalla corre en **modo demo** (`mockApi`) y en **modo real** (`httpApi`); nunca `fetch` directo desde una pantalla |
| Auth | Cognito directo por `fetch` (sin Amplify), tokens en `expo-secure-store` | El API pide el IdToken |
| Back | Lambda + API Gateway REST + DynamoDB + Secrets Manager | Solo el back firma con Open Payments; la app nunca tiene llaves |
| Pagos | Open Payments (SDK de Node) y Test Wallet de Interledger | Montos como `{ value: string, assetCode, assetScale }`; nunca floats |

La decisión que más nos salvó fue el **modo híbrido** ([`src/api/hybridApi.ts`](../src/api/hybridApi.ts)): `EXPO_PUBLIC_REAL_METHODS` dice qué funciones van al back real; las demás siguen en datos de ejemplo. Así la demo nunca dependió de una ruta que el back aún no publicaba, y cada ruta se fue «encendiendo» a medida que salía.

## 2. Contrato primero

Antes de escribir pantallas se acordó el contrato front ↔ back: [`docs/api-contrato.md`](api-contrato.md) y luego [`docs/openapi.yaml`](openapi.yaml). El back documentó cada ruta en `backend/docs/API*.md` con ejemplos en [`backend/docs/CURLS.md`](../backend/docs/CURLS.md). Cuando algo no calzaba, se escribió un documento corto con el formato exacto esperado ([`docs/COORDINACION-BACK.md`](COORDINACION-BACK.md)) en vez de discutirlo por chat.

Señales útiles del API: sin token, una ruta no desplegada da `403 Missing Authentication Token` y una desplegada da `401`. Con eso se sabe qué existe sin credenciales.

## 3. Carriles, ramas y sesiones

| Regla | Detalle |
|---|---|
| Una sesión = un carril = una rama | `feat/<carril>-<tema>` desde `main`; merge a `main` cada ~3 h |
| Carriles del front | `base` (tema, componentes, `src/api`, navegación), `cuenta-natillera`, `pagos`, `creditos`, `pitch` |
| Archivos compartidos | `src/theme`, `src/api`, `src/components`, `app/_layout.tsx`: solo el carril `base`; los demás piden en el tablero |
| Una carpeta por sesión | Nunca dos sesiones de código en la misma carpeta: cada una en su `git worktree` (`frontend-<tema>/`) |
| Tablero compartido | [`MEMORY.md`](../MEMORY.md): carriles, decisiones, propuestas al back, pedidos entre carriles, checklist de entrega. Cada carril edita solo su sección |
| Encargos | Cada sesión paralela arranca con un encargo escrito (qué hacer, qué no tocar, cómo saber que terminó) |
| Push y PR | Solo con OK del coordinador. Antes de un merge o push: `git branch --show-current` y `git status` |

Por qué los worktrees: el 16/10 una sesión cambió de rama la carpeta que otra estaba usando y un merge quedó con el nombre de rama equivocado. Con un worktree por sesión no vuelve a pasar.

Desde el 17/10 el repo es único: el back vive en [`backend/`](../backend/) (traído con `git subtree`, con su historia) y tiene su propio `CLAUDE.md` y `MEMORY.md`.

## 4. Despliegues del back (AWS)

Las reglas completas están en [`backend/docs/COORDINACION.md`](../backend/docs/COORDINACION.md). Nacieron de una noche en que los pagos se cayeron tres veces por cambios cruzados. Lo esencial:

| Regla | Por qué |
|---|---|
| Cada Lambda tiene dueño; solo el dueño despliega | Se subió código a la Lambda equivocada |
| Avisar en el grupo antes de tocar algo compartido | Rol, stage y autorizador son de todos |
| Nunca borrar ni recrear una tabla; nunca quitar políticas del rol | Se borró una tabla y se quitó un permiso en caliente |
| Versión de respaldo antes de reemplazar una Lambda | Volver atrás en un minuto |
| Todo cambio por el repo y su script de `infra/`; la consola es para mirar | Lo que no está en el repo no se puede reconstruir |
| Un despliegue a la vez por stage | El stage tarda ~1 min y mientras tanto responde 403 |

## 5. Calidad antes de `main`

| Chequeo | Comando |
|---|---|
| Tipos | `npm run typecheck` |
| Pruebas (sin red) | `npm test` |
| Uso de IA declarado | `npm run ai-usage-check` |
| Recorrido en web, modo demo | `npx expo start` + tecla `w` |
| Prueba real con sesión | Guía paso a paso como [`docs/prueba-apk-2026-10-17.md`](prueba-apk-2026-10-17.md) |
| Revisión | Auditoría de seguridad y revisión de código antes de integrar ([`docs/auditoria-2026-10-16.md`](auditoria-2026-10-16.md), [`docs/revision-codigo-2026-10-16.md`](revision-codigo-2026-10-16.md)) |

Para correr la app en Android (emulador, celular por cable y APK), ver [`docs/ANDROID.md`](ANDROID.md).

## 6. Versiones

SemVer en [`CHANGELOG.md`](../CHANGELOG.md) (formato Keep a Changelog, en español): `feat` sube la menor y `fix` el parche mientras estemos en `0.x`. Tags anotados `v0.x.y` para la app y `backend-v0.x.y` para el back; `v1.0.0` y su GitHub Release (con el APK) en la entrega.

## 7. Uso de IA

Política de la hackatón: https://interledger.org/hackathon/ai-policy/

| Pieza | Cómo |
|---|---|
| Prompts literales | El hook [`.claude/hooks/log-prompt.mjs`](../.claude/hooks/log-prompt.mjs) los guarda solos en `prompts/AAAA-MM-DD-<persona>-<rama>.md`; otras herramientas se pegan a mano en `prompts/` |
| Declaración | Una fila por tarea en [`AI_USAGE.md`](../AI_USAGE.md) (fecha, persona, herramienta, qué, archivos); el back en [`backend/AI_USAGE.md`](../backend/AI_USAGE.md) |
| Commits | Trailer `Co-Authored-By:` en los commits asistidos |
| Modelos | Un modelo fuerte valida y planea; modelos más rápidos ejecutan tareas acotadas |

Como los prompts se publican, nada sensible va en el chat.

## 8. Secretos

Ningún secreto en el repo, en un `.env` versionado ni en un prompt. `.env.example` y `eas.json` solo llevan valores públicos (URL del API, App Client de Cognito). La llave privada de Open Payments vive en Secrets Manager y solo la lee el back.

## 9. Qué repetiríamos y qué no

| Repetir | Evitar |
|---|---|
| Contrato y mocks antes que pantallas | Dos sesiones de IA en la misma carpeta |
| Modo híbrido para encender rutas reales una por una | Cambios en AWS por consola sin avisar |
| Un worktree por sesión y un tablero compartido | Perder una hora con la Wi-Fi del evento: el celular va por cable |
| Encargos escritos para cada sesión paralela | Dejar el APK para el final: generarlo apenas haya algo que mostrar |
| Hook de prompts desde el minuto uno | Documentos de estado sueltos con fecha: mejor un solo tablero vivo |
| Registro técnico visible en la app (botón «Logs») para depurar en vivo | Unir repos a última hora: arrancar con repo único |
