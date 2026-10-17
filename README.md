# Natillera sin Fronteras — app móvil

> **EN:** A family savings circle ("natillera") whose members live in different countries. Each member pays
> the shared fund in their own currency with **Open Payments**. The fund can also lend to its members.
> Built for the Interledger Open Payments Hackathon (Ruta N, Medellín, Oct 16–17, 2026).
> One repo: the Expo app at the root and the AWS backend in [`backend/`](backend/).

Una **natillera** es un fondo de ahorro en familia: cada periodo todos ponen una cuota en una billetera común,
y el fondo les presta cuando lo necesitan. En muchas familias colombianas sus integrantes viven en países
distintos, y juntar la plata implica remesas, conversiones y alguien que lleve las cuentas a mano.

**Natillera sin Fronteras** junta la cuota de cada persona en su propia moneda (pesos, dólares o euros)
directamente en la billetera del fondo, con **Open Payments** de Interledger. La app está pensada para familias
con adultos mayores: textos cortos en «usted», botones grandes y un botón **A+** para agrandar la letra.

| Bienvenida | Mi natillera | Poner la cuota | Va a su billetera | Cuota puesta |
|---|---|---|---|---|
| ![](docs/pitch/pantallas/01-bienvenida.png) | ![](docs/pitch/pantallas/10-mi-natillera.png) | ![](docs/pitch/pantallas/11-poner-cuota.png) | ![](docs/pitch/pantallas/28-va-a-su-billetera.png) | ![](docs/pitch/pantallas/34-cuota-puesta.png) |

## Descargarla y probarla

| Android (APK v1.0.0) | iPhone y computador (versión web) |
|---|---|
| <img src="docs/qr/qr-apk.png" width="180" alt="QR de la APK"> | <img src="docs/qr/qr-web.png" width="180" alt="QR de la versión web"> |
| [Descargar la APK](https://github.com/Galactic-AIMA/interledger-natillera-sin-fronteras/releases/download/v1.0.0/natillera-sin-fronteras-v1.0.0.apk) · [Release v1.0.0](https://github.com/Galactic-AIMA/interledger-natillera-sin-fronteras/releases/tag/v1.0.0) | [Abrir la app web](https://galactic-aima.github.io/interledger-natillera-sin-fronteras/) |
| Permitir «instalar apps de origen desconocido». Firmada con la llave de depuración (no es de Play Store). Probada en un Android real | Funciona completa con «Empezar con datos de ejemplo». Con una cuenta real, el login pasa pero el API del back aún no tiene CORS para el navegador |

> **EN:** Scan the QR codes to install the Android APK or open the web version (iPhone users). The web version is fully usable in sample-data mode.

Los mismos QR están en la portada de los pitch de [`docs/pitch/`](docs/pitch/).

## Cómo usa Open Payments

**La app nunca firma ni guarda llaves.** El SDK de Open Payments corre solo en el backend (AWS Lambda), y la
app únicamente abre la página de aprobación de la billetera.

```
App ──POST /payments──▶ Backend: incoming payment (fondo) + quote + grant interactivo
App ◀── redirectUrl ───┘
App ──abre la billetera (Test Wallet)──▶ la persona aprueba
Billetera ──▶ Backend GET /payments/{id}/return: verifica el hash, continúa el grant y crea el outgoing payment
Backend ──página «Volver a la app»──▶ natillera://retorno?paymentId=…&result=…
App ──GET /payments/{id}──▶ estado final (pantalla 30 → resultado)
```

- Los montos viajan como `{ value: string, assetCode, assetScale }` en unidades menores. La app nunca usa floats para dinero.
- El monto de `POST /payments` va en la moneda de **quien recibe** (la del fondo o la de la cuenta): así queda fijo lo que
  llega, y la quote calcula cuánto sale de la billetera de quien paga, en su moneda.
- Antes de ir a la billetera, `POST /payments/preview` cotiza sin crear nada, y la pantalla 28 muestra lo que sale y lo
  que llega, cada uno en su moneda.
- Un pago solo se da por hecho cuando el backend lo confirma: la app consulta el estado real en vez de fiarse de la URL de vuelta.

## Qué funciona contra el backend real

Con sesión iniciada, la app llama al backend real en todo menos en **Metas** (`EXPO_PUBLIC_REAL_METHODS` en `eas.json`);
no se mezclan datos de ejemplo con la plata de verdad. Que una ruta responda 401 sin sesión solo dice que existe: lo
que cuenta es la prueba con sesión iniciada en el APK y la Test Wallet.

| Estado (17/10) | Qué |
|---|---|
| Probado de punta a punta (Cognito + API Gateway + Lambda + Test Wallet) | Registro y entrada, perfil, crear natillera y poner la cuota aprobando en la Test Wallet (aporte de 50.000 COP, 17/10 04:03) |
| Desplegado; falta la prueba completa con sesión en el APK | Unirse con código, cuentas guardadas, pagar a una persona con vista previa de la quote, préstamos fase 1 (simular, pedir, mi préstamo, solicitudes, rechazar), préstamos fase 2 (permiso de cobro de las cuotas y desembolso) y cuota automática (permiso recurrente y «Cobrar ahora») |
| Solo en el celular, sin backend | Metas: la meta y su avance viven en la memoria del teléfono y se pierden al cerrar la app (`src/api/goalStore.ts`). Los aportes a una colecta sí son pagos reales con Open Payments |

Cuando una ruta todavía no existe, la app lo dice («todavía no está lista en el servidor, no salió plata») en vez de
mostrar un resultado inventado. Si la persona está en varias natilleras, los préstamos y las solicitudes son siempre
los de la natillera que está viendo.

El botón «Empezar con datos de ejemplo» abre la app completa en demo, sin internet (Doña Rosa, Luz y Andrés).

## Correrla

Requisitos: Node 22+ y [Expo Go](https://expo.dev/go) en el celular (o un emulador de Android).

```bash
npm install
cp .env.example .env      # valores públicos: URL del API, App Client de Cognito, IdToken
npx expo start            # escanear el QR con Expo Go; "w" para abrirla en el navegador
```

- **Solo demo:** `EXPO_PUBLIC_USE_MOCKS=1` en `.env`, o el botón «Empezar con datos de ejemplo».
- **APK (Android):** con EAS (`npx eas-cli build -p android --profile preview`) o en local con Gradle; ver [docs/ANDROID.md](docs/ANDROID.md#4-apk-para-instalar). `eas.json` trae las variables del API.
- **Web:** `npx expo export -p web` (la publicada en GitHub Pages lleva `experiments.baseUrl` solo en el build).
- **Pruebas:** `npm test` (15 casos: cuota, pagos, préstamos, modo híbrido, seguridad de la vuelta de la billetera, teléfono) y `npm run typecheck`.

## Stack

Expo SDK 58 + Expo Router · React Native 0.88 · TypeScript estricto · TanStack Query ·
Cognito directo por `fetch` (sin Amplify) con tokens en `expo-secure-store` · `expo-web-browser`
(`openAuthSessionAsync`) para la billetera · tipografías Gloock, Hanken Grotesk y Martian Mono.

```
src/
  app/          rutas (Expo Router): (auth) 01–03, (tabs) natillera/pagar/ayuda, billetera 28/30, resultado
  api/          client.ts (interfaz) · httpApi.ts (AWS) · mockApi.ts (demo) · hybridApi.ts · auth.ts (Cognito)
  features/     natillera, pagos, creditos, metas, telefono, navegacion
  components/   Screen, Button, Card, ResultScreen…  (áreas táctiles ≥ 48 px, contraste AA)
  theme/        Paleta G, tipografías y escala de texto (A+)
tests/          pruebas con node:test (sin red)
docs/           plan, contrato con el backend (openapi.yaml), pantallas, pitch
backend/        el backend completo en AWS (ver abajo)
```

## Backend

El backend vive en [`backend/`](backend/): Lambdas en TypeScript detrás de API Gateway, Cognito para el registro y
DynamoDB. Es el único lugar donde corre el SDK de Open Payments y donde están las llaves (en Secrets Manager).
Cómo está hecho, sus rutas y cómo desplegarlo: [backend/README.md](backend/README.md).

Se trabajó en un repo aparte y se unió aquí el 17/10 con `git subtree` sin `--squash`, así que conserva la
historia y los commits de cada persona. El repo original queda archivado.

## Seguridad

- No hay secretos en el repo: `.env*` está ignorado y `.env.example` solo trae valores públicos.
- La URL de la billetera se acepta solo si es `https` de `*.interledger-test.dev`, y la vuelta solo se procesa si el pago lo inició esta sesión.
- El backend valida el `returnUrl` contra una lista cerrada y verifica el hash de la interacción.
- Auditoría y pruebas del 16/10: [docs/auditoria-2026-10-16.md](docs/auditoria-2026-10-16.md) · [docs/pruebas-2026-10-16.md](docs/pruebas-2026-10-16.md).

## Documentos

**[Manual de usuario](docs/MANUAL-USUARIO.md)** · **[Manual técnico](docs/MANUAL-TECNICO.md)** · [Plan](docs/PLAN.md) · [Contrato del API (OpenAPI)](docs/openapi.yaml) · [Las 35 pantallas](docs/figma-pantallas.md) ·
[Resumen de Open Payments](docs/open-payments.md) · [Coordinación con el backend](docs/COORDINACION-BACK.md) ·
[Android: emulador, celular y APK](docs/ANDROID.md) · [Cómo trabajamos](docs/COMO-TRABAJAMOS.md) ·
[Guion del pitch](docs/pitch/GUION.md) · [Figma](https://www.figma.com/design/hK29vkj23AZZXEN7W2hjmA)

## Uso de IA

Usamos IA (Claude Code) para construir buena parte del código y la documentación, siempre con revisión humana.
Qué herramienta se usó, para qué y en qué archivos está en [AI_USAGE.md](AI_USAGE.md); los prompts literales están
en [`/prompts`](prompts/), según la [política de IA de la hackatón](https://interledger.org/hackathon/ai-policy/).
La declaración del backend está en [backend/AI_USAGE.md](backend/AI_USAGE.md) y sus prompts en [`backend/prompts/`](backend/prompts/).

## Equipo

- **App:** Henry Taborda y Camilo (Galactic AIMA).
- **Backend:** Duvan Jaramillo y David Ciro.
