# Plan del front · Natillera sin Fronteras

Plan aprobado el 2026-10-16 (Camilo). Es la versión del equipo: qué construimos, en qué orden, quién hace qué y cómo no pisarnos. El estado vivo (quién va en qué) está en [MEMORY.md](../MEMORY.md); la guía personal para Henry, en [HENRY.md](HENRY.md).

## Objetivo y reloj

| Dato | Valor |
|---|---|
| Entrega | **sábado 2026-10-17 11:00** (después no se toca código) |
| Pitch | 12:00, 5 min con demo, en español |
| Prioridad oficial de la hackatón | Un pago de punta a punta con Open Payments (solicitud, autorización, ejecución, confirmación) |
| Alcance elegido | Las 31 pantallas propias navegables y conectadas al back (incluidos préstamos), con modo demo (mocks) como red de seguridad |
| Premio que apuntamos | Inclusión financiera (adultos mayores, familia migrante, tono "usted", botón A+) |

## Reglas de la hackatón que mandan

| Regla | Consecuencia |
|---|---|
| Open Payments obligatorio | El flujo "poner la cuota" se termina y se graba **antes** que cualquier otro |
| Demo en vivo y grabada | Video de respaldo grabado a más tardar a las 08:00 del sábado |
| Repo público, todo en `main` | Ramas cortas `feat/<carril>-<tema>`, merge a `main` cada ~3 h. El back debe pasar de `master` a `main` |
| `AI_USAGE.md` + `/prompts` literales | Ya montado en este repo (hook + script). Nunca pegar llaves ni contraseñas en un prompt |
| Todo el código se escribe en el evento | Solo `create-expo-app` y librerías públicas; nada de plantillas propias previas |
| Slides en la plantilla oficial de Google Slides | Camilo y Henry |

## Verdades técnicas que condicionan el front

1. **El SDK de Open Payments solo corre en Node.** La app nunca firma ni guarda llaves: llama a nuestra API y abre la URL de la billetera.
2. **Todo pago son dos llamadas:** iniciar (devuelve `redirectUrl`) y finalizar (`interact_ref` → `grant.continue` → outgoing payment).
3. Las pantallas 13, 18, 22 y 29 son la **Test Wallet real**; no se construyen.
4. Quotes expiran en ~5 min y tokens en ~10 min: el usuario va a la billetera enseguida.
5. Montos: `value` string entero + `assetCode` + `assetScale`; el front formatea, nunca floats en lógica.
6. Open Payments no expone saldos: el fondo lo calcula el back.

Detalle en [open-payments.md](open-payments.md).

## Arquitectura del front

| Pieza | Elección |
|---|---|
| Base | Expo (SDK estable vigente), TypeScript estricto, Expo Router |
| Datos | TanStack Query sobre un `apiClient` con una interfaz y dos implementaciones: `httpApi` (AWS) y `mockApi` (memoria: Doña Rosa, Luz y Andrés), elegidas por `EXPO_PUBLIC_USE_MOCKS` |
| Modo demo | Botón "Empezar con datos de ejemplo" (pantalla 01) activa `mockApi`; es el plan B si AWS o la Test Wallet fallan en el pitch |
| Auth | Cognito `InitiateAuth` por `fetch` (sin Amplify), tokens en `expo-secure-store` |
| Billetera | `expo-web-browser.openAuthSessionAsync(redirectUrl, 'natillera://retorno')`; la pantalla 30 hace polling a `GET /payments/{id}` |
| Diseño | Paleta G y tipografías Gloock / Hanken Grotesk / Martian Mono ([figma-pantallas.md](figma-pantallas.md)); botón A+ = escala de texto global; `/ui-ux-pro-max` antes de maquetar |
| Montos | `formatAmount({value, assetCode, assetScale})` con `Intl.NumberFormat('es-CO')` |
| Ayuda (35) | Respuestas fijas locales, sin back |

Estructura: `app/(auth)/…`, `app/(tabs)/{natillera,pagar,ayuda}`, `app/flujos/…`, `src/{api,components,theme,hooks,utils}`, `docs/`, `prompts/`.

## Carriles (el reparto para trabajar en paralelo)

| Carril | Alcance | Responsable | Rama | Depende de |
|---|---|---|---|---|
| `base` | Scaffold Expo, tema, componentes compartidos, `src/api` (interfaz + mocks), auth, navegación | Camilo | `main` / `feat/base-*` | Nada. **Es la ruta crítica** |
| `cuenta-natillera` | Pantallas 01–10, 15, 35 | Camilo | `feat/cuenta-*` | `base` |
| `pagos` | Pantallas 11–14 y 26–34 (pagos, recurrente, retorno de billetera) | Henry | `feat/pagos-*` | `base` (scaffold + `apiClient` + tema) |
| `creditos` | Pantallas 16–25 | Henry (Camilo se suma en la madrugada) | `feat/creditos-*` | `base` y, para el pago real, `pagos` |
| `pitch` | Slides, guion de 5 min, video de respaldo | Camilo + Henry | — | Nada para empezar; el video necesita la app andando |
| Back | Flujos 1–12B, `charge-now`, `main`, `AI_USAGE.md` | Duvan y David Ciro | su repo | Contrato [api-contrato.md](api-contrato.md) |

**Dónde chocamos y cómo se evita**

| Riesgo de choque | Regla |
|---|---|
| `src/theme`, `src/api`, `src/components`, `app/_layout.tsx` | Solo el carril `base` los cambia. Si otro carril necesita algo, lo anota en "Pedidos entre carriles" de [MEMORY.md](../MEMORY.md) |
| Pantallas | Cada carril toca solo sus carpetas de pantallas |
| `MEMORY.md` | Cada carril edita solo su sección |
| Dos sesiones sobre lo mismo | Reclamar el carril en `MEMORY.md` antes de empezar |

## Cronograma (vie 16 → sáb 17 11:00)

| Bloque | Camilo | Henry | Back (referencia) |
|---|---|---|---|
| **Ahora** | Scaffold Expo, tema, componentes base, `apiClient` + mocks; **primer push a `main`** | Tareas que no dependen del scaffold ([HENRY.md](HENRY.md), parte A): wallets de prueba, verificar COP y `natillera://`, curso, slides, entorno | Validar contrato, `main`, Cognito + tablas, llave en Secrets Manager |
| Tarde / noche | Pantallas 01–10, 15, 35 | Pantallas 11, 26–34 (pagos y retorno) y 12–14 (recurrente) | Flujos 1–9 |
| Madrugada | Conectar a AWS lo que esté listo; préstamos 16–25 con Henry | Préstamos 16–25 | Flujos 10–12B, `charge-now` |
| 06:00–08:00 | APK, prueba de punta a punta en celular, **grabar video** | Slides finales + guion de 5 min | Arreglos |
| 08:00–11:00 | Congelar `main`, `AI_USAGE.md`, README, enviar formulario | Ensayo del pitch ×3 | Congelar |

Las horas del cronograma son metas del plan, no compromisos verificados; la que manda es la del sábado a las 11:00.

## Propuestas al back (pendientes de respuesta)

| # | Propuesta | Por qué |
|---|---|---|
| 1 | `finish.uri` https del back (`GET /op/finish`) que verifique el hash, finalice y responda 302 a `natillera://retorno?paymentId=…&result=ok\|rejected\|failed` | Su flujo 4 manda `interact_ref` desde la app sin verificar el hash. El front soporta ambos |
| 2 | "Iniciar pago" devuelve también `debitAmount` y `receiveAmount` de la quote | Pantallas 11, 16, 26, 28 |
| 3 | `POST /recurring/{id}/charge-now` (y par de préstamos) | EventBridge P1M no se dispara en 5 min de pitch |
| 4 | `GET /payments/{id}` | Polling de la pantalla 30 |
| 5 | Rama `main`, `AI_USAGE.md` y `/prompts` en la raíz del back | Regla de entrega |

## Verificación (qué significa "terminado")

| Qué | Cómo se comprueba |
|---|---|
| Tipos y salud | `npx tsc --noEmit` y `npx expo-doctor` limpios |
| Modo demo | Recorrer las 31 pantallas sin errores en consola |
| Cuota de punta a punta | Crear natillera → poner cuota entre monedas → aprobar en la Test Wallet → volver por `natillera://retorno` → ver "Cuota puesta" y el aporte en "Lo último que pasó" |
| Recurrente | Activar, aprobar y disparar `charge-now`; ver el cobro en el historial |
| Préstamo | Pedir, autorizar cuotas, tesorera aprueba, ver plan de pagos |
| Entrega | APK en un Android real, video grabado, `node scripts/ai-usage-check.mjs` limpio, repos públicos en `main`, cursos de los 4 confirmados, slides en la plantilla, formulario enviado |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El back no llega a todos los flujos | Modo demo con mocks; en el pitch el pago real es el de la cuota |
| La Test Wallet no ofrece COP | Usar las monedas que ofrezca; verificarlo en la primera hora (tarea de Henry) |
| El rechazo en la billetera no regresa con `result` | El back marca `rejected` si falla `grant.continue`; la app hace polling con timeout y muestra la pantalla 32 |
| 31 pantallas en ~18 h | Componentes compartidos (tarjeta de resumen, fila de monto, pantalla de resultado ✓/✕/!) cubren ~60 % |
| `base` tarde bloquea a Henry | Parte A de [HENRY.md](HENRY.md) mantiene a Henry útil sin el scaffold; el primer push de `base` es la prioridad de Camilo |
