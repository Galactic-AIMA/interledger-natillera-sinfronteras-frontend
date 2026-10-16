# PITCH-CONTEXTO · Natillera sin Fronteras

Fuente única para preparar el pitch. Corte actualizado: **viernes 16/10/2026 ~12:45 (hora Colombia)**, sobre `main` en `ffd9917` (pantallas 01–10, 15 y 35) + `feat/pagos` en `7d4c5e8` (11, 12, 26, 27, 28, 30 y resultado), integradas localmente para probar. `feat/pagos` aún no está en `main`. Todo lo que no consta en el repo va marcado **[CONFIRMAR]**.

Reloj: entrega de código **sáb 17/10 11:00** · video de respaldo **antes de las 08:00** · pitch **12:00**, 5 min con demo, en español.

---

## 1. Qué es, en 2 frases (sin jerga)

> Natillera sin Fronteras es la natillera de toda la vida, pero en el celular: la familia ahorra junta en un mismo fondo, aunque cada uno viva en un país distinto y gane en otra moneda.
> Cada quien pone su cuota desde su propia billetera, en su moneda; al fondo le llegan pesos, y la app le muestra a todos cuánto llevan, quién está al día y quién pidió prestado.

Palabras prohibidas en escena: grant, quote, wallet address, API, backend, Lambda, token. Se dice "billetera", "permiso", "cuota", "fondo".

## 2. Personajes (tomados de `src/api/mockApi.ts`)

| Personaje | Usuario demo | Dónde vive (según el mock) | Moneda | Papel |
|---|---|---|---|---|
| **Doña Rosa** | `rosa.gomez` | Colombia (celular +57) | pesos (COP) | Creó la natillera; es la **tesorera** (admin) |
| **Luz** | `luz` | Estados Unidos (celular +1 305) | dólares (USD) | Socia |
| **Andrés** | `andres` | España (celular +34) | euros (EUR) | Socio |

Datos de la natillera de ejemplo:

- **"Natillera Familia Rosa"**, código de invitación **ROSA-4821**, cuota **$50.000** (pesos).
- Lleva **$150.000**: tres aportes de Doña Rosa (15 ago, 15 sep, 15 oct 2026).
- Luz y Andrés: **$0**, "Falta 2" cada uno (así lo muestran el mock y el boceto 15).
- Cambio de ejemplo del mock: 1 USD = $4.019 · 1 EUR = $4.545 · costo del envío ~1,2 %.
- En modo demo, entrar con "Empezar con datos de ejemplo" abre la app **como Doña Rosa**.

Historia que respalda el repo: una familia que ahorra junta repartida en tres países (Colombia, EE. UU., España). Lo que **no** dice el repo y hay que confirmar antes de contarlo:

- [CONFIRMAR] Parentesco: ¿Luz y Andrés son hijos de Doña Rosa? (El boceto 27 dice "Luz, mi hija" como nombre de cuenta guardada; de Andrés no hay nada.)
- [CONFIRMAR] Ciudades concretas (Miami, Madrid…). El mock solo da prefijo telefónico y moneda.
- [CONFIRMAR] Edad de Doña Rosa / que sea adulta mayor. El público objetivo sí son adultos mayores (CLAUDE.md), pero el personaje no trae edad.

## 3. El "camino del pitch", pantalla por pantalla

Orden acordado (docs/EJECUCION-PANTALLAS.md): **01 → 03 → 10 → 11 → 28 → billetera → 30 → 34 → 10**. Texto exacto de cada pantalla según `docs/figma-pantallas.md` / `docs/_figma_raw.txt`. Estado real según `src/app` en `main` a las 12:15.

| Paso | Pantalla (ruta) | Lo que ve el jurado (texto Figma) | Qué decir | Estado hoy en `main` |
|---|---|---|---|---|
| 1 | **01 Bienvenida** (`(auth)/bienvenida.tsx`) | "Natillera" · A+ · dibujo de la alcancía · **"Ahorre en familia"** · "Aunque vivan en países distintos." · Crear mi cuenta · Ya tengo cuenta · Empezar con datos de ejemplo | "Así abre la app. Una sola idea: ahorrar en familia, aunque estén lejos." Mostrar **A+** aquí. | **HECHA** (funcional). La alcancía es un ícono `wallet-outline` provisional; la ilustración está en el plan de la sesión A |
| 2 | **03 Entrar** (`(auth)/entrar.tsx`) | "Entrar" · A+ · Usuario · Contraseña · Entrar | "Entra Andrés, desde España." [CONFIRMAR quién entra, ver §6] | **HECHA** (probada con clics como Andrés) |
| 3 | **10 Mi natillera** (`(tabs)/natillera/index.tsx`) | "Mi natillera" · frasco + camino del año · **"Entre todos llevan"** · Fondo (suma de aportes) **$150.000** · Su ahorro · Lleva $150.000 · Estado **Al día** · **Poner la cuota** · ¿Quién pone? · Préstamos · **Lo último que pasó**: Doña Rosa +$50.000 | "Todos ven lo mismo: cuánto hay en el fondo, cuánto lleva cada uno y si está al día. Se acabó el cuaderno." | **HECHA** (rama `cuenta-natillera`, ya en `main`) |
| 4 | **11 Poner la cuota** (`(tabs)/natillera/cuota.tsx`) | "Poner la cuota" · ¿A nombre de quién? **Mía / Doña Rosa** · Resumen: Llega a la natillera **$50.000** · Sale de su billetera **11,00 €** · Costo del envío **0,13 €** · Poner la cuota · "Su billetera le pide permiso antes." · Que se cobre sola | "Andrés pone en euros, a la natillera le llegan pesos. Antes de tocar nada ya sabe cuánto sale, cuánto llega y cuánto cuesta." | **HECHA** en `feat/pagos`. Andrés ve: llega $50.000 · sale 11,13 € · costo del envío 0,13 € |
| 5 | **28 Antes de la billetera** (`billetera/antes.tsx`) | "Va a su billetera" · 1. Se abre su billetera — Es otra app · 2. Revise y toque «Aprobar» — Ve cuánto sale y cuánto llega · 3. Vuelve aquí sola — Le contamos si se hizo · Ir a la billetera · Ahora no | "Le explicamos en tres pasos qué va a pasar. Nadie se pierde." | **HECHA** en `feat/pagos` |
| 6 | **Billetera** (13/29 = Test Wallet real; no se construye) | Boceto 29: "BILLETERA (otra app)" · "La natillera quiere hacer un pago" · Paga · Recibe · Sale · Llega · **Aprobar / Rechazar** | "La plata nunca la toca la app. Andrés da el permiso en su propia billetera." (aquí va la **única** mención de la tubería, ver guion) | Modo real: Test Wallet, depende del back. **Modo demo: un diálogo del sistema** ("Billetera de prueba · …", Aprobar / Rechazar) en `src/api/wallet.ts` — ya existe |
| 7 | **30 Volviendo** (`billetera/volviendo.tsx`) | "cargando…" · **"Volviendo de su billetera…"** · "Estamos confirmando lo que usted decidió." | (silencio, 2 s) | **HECHA** en `feat/pagos` |
| 8 | **34 Cuota puesta** (`resultado.tsx`) | ✓ **"Cuota puesta"** · Resumen: Llegó a la natillera **$50.000** · Salió de su billetera **11,00 €** · Listo | "Listo. Cuota puesta, desde España, en menos de un minuto." [CONFIRMAR el tiempo cronometrando el video] | **HECHA** en `feat/pagos` |
| 9 | **10 otra vez** | "Lo último que pasó": aparece el nuevo aporte de **+$50.000** y el fondo sube | "Y Doña Rosa lo ve de una. El fondo creció." | **Funciona**: el fondo pasa de $150.000 a $200.000 y aparece "Andrés +$50.000". **Pero Andrés sigue en "Debe cuota"** (el mock le cobra 2 periodos) — ver hallazgo 6 |

Resumen (12:45): **el camino del pitch completo funciona en modo demo** con `main` + `feat/pagos`, recorrido con clics en navegador como Doña Rosa y como Andrés, sin errores de consola. Falta: merge de `feat/pagos` a `main` y probarlo en el celular. Lo que sí está listo debajo: tema (Paleta G, fuentes, A+ de 3 niveles), componentes (`Screen`, `Button`, `Card`, `InfoRow`, `Choice`, `ResultScreen`…), capa de datos con mock completo (pago, aporte, recurrente, préstamos), billetera simulada en demo y polling del pago. Meta del plan: camino completo en demo **~18:00 del viernes**.

### Hallazgos del código que afectan la demo

1. **Moneda según quién entra.** "Empezar con datos de ejemplo" entra como **Doña Rosa (pesos)**. Si ella pone la cuota, el mock no hace cambio de moneda: sale $50.000 y llega $50.000, **sin euros** (el mock calcula un costo de ~$600 pero no lo suma). Los 11,00 € / 0,13 € del boceto solo aparecen si paga **Andrés**. Para mostrar "sin fronteras" hay que entrar como Andrés (necesita 03 Entrar con `andres`, o el selector de usuario de la pantalla 04, o cambiar el usuario por defecto del demo) → [CONFIRMAR] con Camilo.
2. **Cifra de "Salió de su billetera".** El mock calcula lo que sale **sumando** el costo: 11,00 € + 0,13 € = **11,13 €**. El boceto muestra "Sale 11,00 €" y "Cuota puesta… Salió 11,00 €". Decidir qué número se dice en voz alta y que pantalla 11 y 34 coincidan → [CONFIRMAR].
3. **Billetera demo en navegador.** Resuelto en `feat/pagos`: en web sale un `window.confirm` (Aceptar = Aprobar). Funciona, pero se ve como un cuadro del navegador. Para el pitch, mejor el celular (en Android sale el diálogo Aprobar / Rechazar).
4. **"A nombre de quién".** El mock soporta pagar a nombre de otro (`onBehalfOfUserId`): el aporte queda a nombre de Doña Rosa y "pagado por" Andrés. Sirve para la historia "el hijo le pone la cuota a la mamá" — solo si se confirma el parentesco.
5. La pantalla 10 del boceto dice "Su ahorro · Lleva $150.000 · Al día" (vista de Doña Rosa). Si entra Andrés, el mock dirá **$0 y "Falta 2"** → la primera vista de 10 en el pitch se ve distinta al boceto. Eso puede ser bueno para la historia ("Andrés está atrasado, pone su cuota") [CONFIRMAR].

6. **Andrés sigue "Debe cuota" después de pagar.** El mock calcula 2 periodos pendientes y Andrés no tiene aportes, así que tras pagar queda debiendo 1. En el pitch parece que el pago no contó. Arreglo de una línea en `mockApi.ts` (carril `base`): darle a Andrés un aporte previo, para que al pagar quede **Al día** — el remate visual de la demo.

## 4. Qué funciona hoy vs qué está en riesgo

| Pieza | Estado | Fuente |
|---|---|---|
| Base (tema, fuentes, A+, componentes, datos, mocks, navegación) | Lista | MEMORY.md bitácora `base` |
| Pantallas 01–10, 15, 35 | Hechas en demo, en `main` | `ffd9917` |
| Pantallas 11, 12, 26, 27, 28, 30, resultado (14, 31–34) | Hechas en demo, en `feat/pagos` (sin merge) | `7d4c5e8` |
| Préstamos 16–25 | **Pendientes — ahora son de Henry** (traspaso en MEMORY.md) | bitácora `pagos` |
| Prueba en celular / Expo Go | Pendiente | MEMORY.md |
| Back (AWS) | Sin URL en `.env.example`; contrato en borrador; el front trabaja solo con mocks hasta la madrugada | docs/api-contrato.md, MEMORY.md |
| Pago real con Test Wallet | No probado. Pendiente: wallets de prueba, si hay COP, si acepta `natillera://retorno` (tareas A1–A3 de Henry) | docs/HENRY.md |
| Cobro automático y préstamos | Mock listo; pantallas sin hacer. **Fuera del camino del pitch** | mockApi.ts |
| APK | No generado (meta 17/10 06:00–08:00) | EJECUCION-PANTALLAS.md |

Riesgo principal: que a las 18:00 no esté el camino en demo y se coma la noche. Segundo: que el pago real con la Test Wallet no se logre y solo quede el modo demo (la hackatón pide como prioridad oficial un pago de punta a punta con Open Payments — PLAN.md).

## 5. Requisitos de entrega que tocan el pitch

Del checklist de MEMORY.md y PLAN.md:

- [ ] **Slides en la plantilla oficial de Google Slides** (Camilo + Henry). [CONFIRMAR] link de la plantilla: no está en el repo.
- [ ] **Link de demo en el Drive del equipo + formulario enviado.** [CONFIRMAR] link del Drive y del formulario.
- [ ] **Video de respaldo grabado antes de las 08:00 del sábado** (pago de punta a punta; ideal con la Test Wallet real).
- [ ] **Pago de punta a punta con la Test Wallet grabado.**
- [ ] **APK instalado en un Android real.**
- [ ] **`AI_USAGE.md` completo** y `node scripts/ai-usage-check.mjs` limpio (front y back). Hoy AI_USAGE solo tiene filas de Camilo: **Henry debe agregar sus filas** (incluido el trabajo del pitch con IA) y sus prompts literales en `/prompts` (`prompts/henry-<herramienta>.md` si no es Claude Code). Completar "What We Did Ourselves".
- [ ] Declarar si los bocetos de Figma o el diagrama usaron IA.
- [ ] Los 4 hicieron el curso de Platzi o la Guide to Open Payments.
- [ ] Todo en `main`, repos públicos (el back hoy usa `master`).

Para el pitch: nada de llaves, contraseñas ni `private.key` en slides, video ni prompts (los prompts se publican).

## 6. Riesgos y plan B

| Si pasa esto | Hacemos esto |
|---|---|
| El back no llega o falla en vivo | Demo en **modo demo**: botón "Empezar con datos de ejemplo" (o `EXPO_PUBLIC_USE_MOCKS=1`). La billetera es un diálogo con Aprobar / Rechazar. Decirlo con honestidad: "esto es la app con datos de ejemplo; el pago real lo grabamos" |
| La Test Wallet falla, se demora o no vuelve a la app | Cortar al **video de respaldo** (grabado antes de las 08:00), preparado en una pestaña aparte y con el audio probado |
| Wi-Fi del evento caído | Modo demo no necesita back; [CONFIRMAR] si el bundle de Expo Go necesita red → por eso el **APK**. Tener datos móviles de respaldo |
| Pantalla del celular no se proyecta | [CONFIRMAR] cómo se proyecta (cable, scrcpy, cámara). Probarlo en el ensayo |
| Demo en navegador | **No**: la billetera demo puede no aparecer en web (ver §3, hallazgo 3) |
| No da el tiempo | La demo cabe en ~2:00; cortar primero el bloque "cómo lo hicimos", nunca el cierre |

## 7. Preguntas abiertas para Henry

1. **¿Quién paga en la demo?** Para que se vean euros → pesos tiene que entrar **Andrés**; el botón de ejemplo entra como Doña Rosa. ¿Pedimos a Camilo que 03 o el usuario por defecto del demo permita entrar como `andres`?
2. **¿Qué número se dice de "salió"?** 11,00 € (boceto) o 11,13 € (mock con costo incluido). Pantallas 11 y 34 deben coincidir.
3. **¿Demo en vivo real, demo en modo ejemplo o video?** ¿Hay pago real con la Test Wallet antes de las 08:00, o asumimos modo demo en vivo + video del pago real?
4. **Historia del personaje:** ¿parentesco (hijos de Doña Rosa), ciudades y edad? ¿El relato es "Andrés le pone la cuota a nombre de su mamá"?
5. **Logística:** link de la plantilla oficial de slides, del Drive y del formulario; cómo se proyecta el celular; quién habla (¿Henry y Camilo se reparten bloques?).

Otras: ¿se menciona el monto de premio/categoría (inclusión financiera) en voz alta? ¿Se muestra el préstamo como "lo que sigue" o se calla?
