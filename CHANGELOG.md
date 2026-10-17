# Historial de versiones · Natillera sin Fronteras

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones según [SemVer](https://semver.org/lang/es/). Horas de Colombia (UTC−5).

- **App (front):** tags `vX.Y.Z` sobre `main`. Las versiones 0.x se marcaron después, sobre los commits de `main` que cerraron cada hito de la hackatón; la `v1.0.0` es la entrega del 2026-10-17 a las 11:00.
- **Backend:** tags `backend-vX.Y.Z` sobre la historia del back, que entró completa en [`backend/`](backend/) con `git subtree` (PR #10). Hasta `backend-v0.7.1` esa historia vivió en el repo [`duvanjaramillomarin/interterledger-natillera-sin-fronteras-backend`](https://github.com/duvanjaramillomarin/interterledger-natillera-sin-fronteras-backend), hoy congelado.
- Cada versión nombra su commit; con `git show <tag>` se ve el estado exacto.

## [Sin publicar]

## App (front)

## [1.0.1] · 2026-10-17 10:45 · `0220506` · 📦 cierre de la entrega
La app es la misma de la `v1.0.0`: no cambió nada en `src/`, `app.json`, `package.json` ni `eas.json`, así que sirve la APK de la [Release `v1.0.0`](https://github.com/Galactic-AIMA/interledger-natillera-sin-fronteras/releases/tag/v1.0.0). Esta versión suma los arreglos del back y la documentación que entraron por PR hasta las 10:45. El PR #20 (guía animada en la app) queda fuera: cambia la interfaz congelada y espera el OK de Camilo.
### Arreglado (backend)
- Los permisos de cuotas de préstamo y de cuota automática vuelven a la app por la página «Volver a la app» (PR #21, `1c5147d`).
- El back termina el permiso de cuotas cuando vuelve la billetera (PR #22, `f3f56ae`).
- `return-payment` vuelve a la app con una página en vez de un 302, lo que quita el «Internal Server Error» de la Test Wallet. Ciro lo desplegó y lo probó con un aporte real a las 09:05 (PR #17, `d62067f`).
### Documentación
- Cierre del back: repo único, IdToken en `openapi.yaml` y `return-payment` probado (PR #17, Ciro). Préstamos fase 2 probados con dinero real (PR #23, `af8ffcc`).
- Manual de usuario y manual técnico en `docs/` (PR #18).
- Pitch: intro de 1 minuto y roles del equipo, versión en el orden de la plantilla oficial, sección técnica de Open Payments e Interledger, presentación de 4 láminas para proyectar con el video y QR de descarga (APK y web para iPhone) en la portada (`5454851`, `24218b1`, `908a6f8`, `ff13059`, `bd60f43`, `b2a683a`).
- Descarga de la APK y versión web con QR en el README; build local de la APK en `docs/ANDROID.md` (PR #24, `44e46a4`).
- Tablero y checklist de entrega al día, más los prompts de las sesiones de la raíz (PR #19).

## [1.0.0] · 2026-10-17 09:10 · `4373242` · 🏁 entrega
Versión de entrega de la hackatón; la APK de Android va adjunta a la Release `v1.0.0`. Interfaz igual a la `v0.11.0` más los sonidos de la `v0.12.0`.
### Distribución
- **APK de Android** adjunta a la [Release `v1.0.0`](https://github.com/Galactic-AIMA/interledger-natillera-sin-fronteras/releases/tag/v1.0.0) (09:50; build local con Gradle, 86 MB, firma de depuración). Probada en el emulador y en un Android real.
- **Versión web para iPhone** en GitHub Pages: https://galactic-aima.github.io/interledger-natillera-sin-fronteras/ (rama `gh-pages`, export de este mismo tag).
### Arreglado
- Backend: `return-payment` vuelve a la app con una página en vez de un 302 (PR #16).
### Documentación
- Pitch corto para presentar con el video y versión con el orden de la plantilla oficial (`4373242`).
- Repo renombrado a `interledger-natillera-sin-fronteras` (`55fdf74`); prompts del video demo y de la entrega en `prompts/`.
- Pitch en HTML con 13 láminas (5:15): «Lo que se está perdiendo», figuras de Doña Rosa, Luz y Andrés, «Una colecta con nombre propio» y «El impacto»; modo claro y oscuro y capturas incrustadas (`208e34d`, `d9fbab6`, `5f1f4c1`). Sin cambios en la app.
- Tablero, `CLAUDE.md`, memoria del back y `AI_USAGE.md` al día (06:55).


## [0.12.0] · 2026-10-17 06:50 · `4f6b68c` · 🔊 sonidos
Única excepción a la interfaz congelada, por pedido de Camilo: solo sonido, sin cambio visual.
### Agregado
- Aviso sonoro «ding-ding» al completar un pago (P2P, aporte a una meta o desembolso de un préstamo).
- Sonido de monedas cayendo al bote al poner la cuota y cuando crece el fondo de la natillera mientras se mira el inicio (aporte propio o de otro socio). Sonidos sintetizados por código, sin derechos de terceros.

## [0.11.0] · 2026-10-17 06:10 · `b35f29d` · 🔒 interfaz final
Versión final de la interfaz: desde aquí la interfaz queda **congelada** (ver «Interfaz congelada» en `CLAUDE.md`). La `v1.0.0` de la entrega no cambia la interfaz.
### Agregado
- Bote de la portada rediseñado: frasco de vidrio con tapa de alcancía, monedas que se apilan según el fondo, moneda que cae por la ranura, etiqueta con los anillos de la familia y camino del año hasta la estrella del reparto de diciembre.
- «¿Olvidó su contraseña?» en Entrar, con recuperación en modo demostración.
- Este historial de versiones y los tags de las versiones anteriores (PR #14).
- Guías de Android y de cómo trabaja el equipo (PR #15).
### Cambiado
- Splash de entrada en 3 s exactos, con halo, onda de unión, barra de carga y crédito de Open Payments.

## [0.10.2] · 2026-10-17 05:32 · `5efbdaa`
### Cambiado
- Metas sin backend dichas tal cual: aviso «Por ahora, solo en este celular» en la 36 con sesión real (PR #11).
- README con tres estados: probado, desplegado sin prueba completa y solo en el celular.
### Agregado
- Lista de prueba con sesión en el APK: `docs/prueba-apk-2026-10-17.md`.

## [0.10.1] · 2026-10-17 05:22 · `533569f`
### Arreglado
- La pantalla 28 muestra con qué billetera entrar a la Test Wallet, para evitar «Access to the given resource is forbidden» (PR #12).

## [0.10.0] · 2026-10-17 04:47 · `69dc490`
### Cambiado
- Repo único: el backend entra en `backend/` con su historia completa (PR #10).
- Todas las funciones van al back real en el perfil `preview` de `eas.json`; el historial ya no mezcla pagos de ejemplo (PR #8).
- Préstamos y solicitudes de la tesorera piden los de la natillera que se está viendo (PR #8).
### Arreglado
- Vista previa del pago con espera en vez de una consulta por tecla y aviso de billetera inexistente (PR #9).
### Agregado
- Estado de la madrugada, pitch y video (PR #3).

## [0.9.0] · 2026-10-17 03:38 · `c69d339`
### Agregado
- Botón «Logs» visible por defecto, con copiar al portapapeles de un toque.
- Pitch con capturas de la app actual y roles del equipo.

## [0.8.0] · 2026-10-17 02:56 · `87d1be3`
### Agregado
- Marca Anillos: logo, splash animado, anillos girando con el slogan en lugar del spinner.
- Barrido UX/UI: Ayuda como hogar, cuota con anillos y «¿Quién ya puso?».
### Hito
- Primer aporte real desde la app: $50.000 COP de `prueba3` a «Familia Ciro» (~02:51, emulador).

## [0.7.0] · 2026-10-17 01:33 · `ec5c4cb`
### Agregado
- Préstamos fase 1 reales y aviso en la 17 cuando el permiso de cobro no existe.
- Botón flotante con el registro técnico en vivo.
### Arreglado
- El perfil `preview` vuelve a mandar finish, get e historial de pagos al back.

## [0.6.0] · 2026-10-16 23:36 · `38a8ca0`
### Agregado
- Bloque A real (perfil, natilleras, cuentas, invitaciones) y pagos por `POST /payments`.
- Varias natilleras por persona con selector en la 10.

## [0.5.0] · 2026-10-16 22:20 · `8cfe9b7`
### Agregado
- Pagos P2P reales contra el API REST del back, historial real y nombre del destinatario.
### Arreglado
- Consulta del estado si se cierra la billetera; monto P2P en la moneda de quien recibe.
- Respuestas proxy que llegan como 200 con `statusCode` adentro.

## [0.4.0] · 2026-10-16 17:15 · `1744c1c`
### Agregado
- Metas de la familia (ahorro y colecta), solo en el front.
- Fecha y hora pequeñas en los movimientos.

## [0.3.0] · 2026-10-16 16:43 · `5979876`
### Agregado
- Modo híbrido: Cognito real para registro, entrada y perfil; lo demás en datos de ejemplo.
- Registro técnico en Su cuenta e indicativo de país con buscador.
- Rama de Henry: préstamos, registro con Cognito, `openapi.yaml`, `eas.json`, pruebas y pitch (PR #1).

## [0.2.0] · 2026-10-16 12:49 · `da44d32`
### Agregado
- Pantallas de cuenta-natillera (01–10, 15, 35) y de pagos (11, 12, 26–28, 30 y resultado), en modo demo.

## [0.1.0] · 2026-10-16 11:57 · `0570cba`
### Agregado
- Scaffold Expo SDK 58, tema, componentes, capa de datos con modo demo y navegación.

## Backend

## [backend-0.7.1] · 2026-10-17 04:41 · `e32dcda`
### Cambiado
- Repo del back congelado; pasa a `backend/` del repo único. Declaración de IA de Duvan (PR #12 y #13 del back).

## [backend-0.7.0] · 2026-10-17 04:21 · `25fcb5f`
### Agregado
- Varias natilleras por persona, préstamos fase 2 y cuota automática con Open Payments (PR #8, #9 y #11 del back; despliegue `1x7kck`, sin prueba real completa).
### Cambiado
- `return-payment` responde el 302 de una y completa en segundo plano.

## [backend-0.6.0] · 2026-10-17 02:03 · `65fdfd3`
### Arreglado
- `start-payment` funcionando con la tabla `natillera-payments` (PR #7 del back).

## [backend-0.5.0] · 2026-10-17 01:01 · `5299045`
### Agregado
- Préstamos fase 1 sin Open Payments (simular, pedir, listar, mi préstamo, rechazar) y con varias natilleras (PR #3 y #4 del back).
- Rama `main` del back (PR #5).

## [backend-0.4.0] · 2026-10-16 22:33 · `3be2f47`
### Agregado
- Bloque A desplegado: `/me`, `/wallets/verify`, `/accounts`, `/natilleras`, `/natilleras/mine`, `/natilleras/join`, `/invitations/{code}`.
### Arreglado
- Código de invitación con ~40 bits de entropía; `NATILLERA_RECORDS_TABLE` en pagos.

## [backend-0.3.0] · 2026-10-16 21:39 · `31c0f73`
### Agregado
- Opción B: la billetera vuelve por https a `return-payment`, que finaliza y redirige a la app.
### Hito
- Primer pago real EUR→COP completo.

## [backend-0.2.0] · 2026-10-16 20:02 · `66408a9`
### Agregado
- Pagos `start`, `finish` y `get` según el contrato del front, desplegados por AWS CLI (tabla, Lambdas, rutas VTL y autorizador).
- Documentación completa del API y script de prueba del pago.

## [backend-0.1.0] · 2026-10-16 13:09 · `2f3b5de`
### Agregado
- Cognito y Lambda pre-signup probados de punta a punta (solo consulta el host de la Test Wallet).

[Sin publicar]: https://github.com/Galactic-AIMA/interledger-natillera-sin-fronteras/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Galactic-AIMA/interledger-natillera-sin-fronteras/compare/v0.12.0...v1.0.0
[0.10.2]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/releases/tag/v0.1.0
[backend-0.7.1]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/backend-v0.7.0...backend-v0.7.1
[backend-0.7.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/backend-v0.6.0...backend-v0.7.0
[backend-0.6.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/backend-v0.5.0...backend-v0.6.0
[backend-0.5.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/backend-v0.4.0...backend-v0.5.0
[backend-0.4.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/backend-v0.3.0...backend-v0.4.0
[backend-0.3.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/backend-v0.2.0...backend-v0.3.0
[backend-0.2.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/backend-v0.1.0...backend-v0.2.0
[backend-0.1.0]: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/releases/tag/backend-v0.1.0
