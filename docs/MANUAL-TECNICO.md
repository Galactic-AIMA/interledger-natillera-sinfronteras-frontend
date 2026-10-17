# Manual técnico — Natillera sin Fronteras

Para quien desarrolla o mantiene el proyecto. No es para quien usa la app: su guía es el
[manual de usuario](MANUAL-USUARIO.md).

Repo único: la app Expo en la raíz y el backend de AWS en [`backend/`](../backend/). Versión de entrega: `1.0.0`
([CHANGELOG](../CHANGELOG.md)).

## 1. Arquitectura

```
Celular (Expo / React Native)
  └─ src/api/hybridApi.ts ── decide por función: back real o datos de ejemplo
        ├─ Cognito (us-east-2) por fetch: SignUp e InitiateAuth; tokens en expo-secure-store
        └─ API Gateway REST /dev ── autorizador Cognito (IdToken) ── Lambdas (Node 22)
                                                   ├─ DynamoDB (7 tablas)
                                                   ├─ Secrets Manager (llave del cliente OP y tokens de grants)
                                                   └─ SDK @interledger/open-payments ──▶ Test Wallet (Rafiki)
Test Wallet ── aprueba ──▶ GET /payments/{id}/return (pública) ──página «Volver a la app»──▶ natillera://retorno
```

Reglas que no se rompen:

1. **La app nunca firma ni tiene llaves.** El SDK de Open Payments solo corre en Lambda. La app abre la URL de la
   billetera (`WebBrowser.openAuthSessionAsync`) y vuelve por `natillera://retorno`.
2. **Montos** siempre `{ value: string, assetCode, assetScale }` en unidades menores. `BigInt` para operar,
   `formatAmount` para mostrar. Nunca `number` para dinero.
3. **Ninguna pantalla llama `fetch`.** Todo pasa por la interfaz `NatilleraApi` de `src/api/client.ts`.
4. **Un pago está hecho solo cuando el back lo dice** (`GET /payments/{id}`), no por la URL de vuelta.
5. Ningún secreto en el repo, en `.env` versionado ni en un prompt (los prompts se publican).

## 2. Estructura

```
src/
  app/            rutas de Expo Router (cada archivo empieza con el número de pantalla de Figma)
    (auth)/       01 bienvenida · 02 crear cuenta · 03 entrar · recuperar clave
    (tabs)/       natillera/ (05–12, 15–25, 36–38) · pagar/ (26–27) · ayuda (35)
    billetera/    28 antes de la billetera · 30 volviendo
    resultado.tsx 14 y 31–34: resultado de cualquier flujo de pago o permiso
    retorno.tsx   deep link natillera://retorno
  api/            client.ts (interfaz) · httpApi.ts · mockApi.ts · hybridApi.ts · auth.ts · wallet.ts · queries.ts
  features/       lógica y piezas por dominio (natillera, pagos, creditos, metas, telefono, ayuda, registro)
  components/     Screen (título + A+), Button, Card, Choice, TextField, ResultScreen…
  theme/          Paleta G, fuentes, tokens y TextScaleProvider (A+ de 3 niveles)
  utils/          money, dates, names, sounds, useDebouncedValue
tests/            node:test sin red (stubs de Expo en tests/*-stub.mjs)
backend/          Lambdas, scripts de despliegue y docs del back (rigen backend/CLAUDE.md y backend/MEMORY.md)
docs/             contrato (openapi.yaml), pantallas, pitch y estos manuales
prompts/          prompts literales de IA (los escribe el hook .claude/hooks/log-prompt.mjs)
```

## 3. Capa de datos y modos

`src/api/client.ts` define `NatilleraApi`. Hay tres implementaciones:

| Implementación | Cuándo | Qué hace |
|---|---|---|
| `mockApi.ts` | `EXPO_PUBLIC_USE_MOCKS=1` o el botón «Empezar con datos de ejemplo» | Todo en memoria con Doña Rosa, Luz y Andrés. La billetera se simula con un `Alert` |
| `httpApi.ts` | — | Una función por ruta del back |
| `hybridApi.ts` | Con sesión real (lo normal en el APK) | Login, registro, perfil y `verifyWallet` siempre reales; el resto es real si su nombre está en `EXPO_PUBLIC_REAL_METHODS` |

Reglas del híbrido que conviene conocer:

- La cuota (`kind: 'aporte'`) va real solo si `getMyNatillera` también es real: el back exige que la natillera exista.
- `finishPayment` y `getPayment` van al back solo para los pagos que él creó (`realPaymentIds`).
- Con pagos reales, el historial sale solo del back: nunca se mezclan pagos de ejemplo con plata de verdad.
- Los grants del préstamo siguen a `requestLoan`; `listMyNatilleras` sigue a `getMyNatillera`.
- **Metas no tiene back** (`/goals` responde 403). `goalStore.ts` las guarda en memoria del teléfono y se pierden al
  cerrar la app; la pantalla 36 lo avisa. Los aportes a una colecta sí son pagos reales (`kind: 'p2p'`).

Datos con TanStack Query: claves en `keys` de `queries.ts`; después de pagar se invalidan `keys.natillera` y `keys.payments`.

## 4. Flujos con Open Payments

| Flujo | Rutas | Vuelta a la app |
|---|---|---|
| Pago o cuota (P2P y aporte) | `POST /payments/preview` → `POST /payments` → billetera → `GET /payments/{id}/return` → `GET /payments/{id}` | **Opción B**: la billetera vuelve a `return-payment`, que verifica el hash, responde una página que abre la app y completa el pago en segundo plano. La pantalla 30 consulta el estado hasta que es final |
| Cuota automática | `POST /recurring` → billetera → `POST /recurring/{grantId}/finish` → `POST /recurring/{grantId}/charge-now` | **Opción A**: Rafiki vuelve directo a `natillera://retorno?grantId=…` con `interact_ref` y `hash`; la app llama a `finish` |
| Préstamo | `GET /loans/simulate` → `POST /loans/requests` → `POST …/repayment-grant` → billetera → `POST /loans/repayment/{grantId}/finish` → tesorera `POST …/decision` (aprobar = desembolso, que sigue el flujo de pago) | Grant: opción A. Desembolso: opción B |

Detalles que ya costaron horas:

- **«Internal Server Error» en la Test Wallet** = un segundo toque a Accept. Antes, `return-payment` respondía un 302 a
  `natillera://`; Chrome en Android lo bloquea si la aprobación tarda, la pestaña se queda en Accept y la persona toca
  otra vez. Ya responde una página con «Volver a la app». Los grants de opción A todavía pueden mostrarlo: el pago o el
  permiso igual queda hecho.
- **«Access to the given resource is forbidden»**: la sesión abierta en la Test Wallet es de otra cuenta. Cerrar
  sesión y entrar con la dueña de la billetera que paga. La pantalla 28 dice con cuál entrar.
- La interacción vence en ~10 minutos.
- Monto fijo de débito EUR → COP falla en la quote (`non-positive receive amount`). Por eso el monto va en la moneda
  de **quien recibe**.
- `return-payment` acepta solo `returnUrl` de una lista cerrada (`natillera://retorno`, `exp://…/--/retorno`).

## 5. Variables de entorno

Solo valores públicos. `.env` no se versiona; `.env.example` es la plantilla; el APK toma las de `eas.json`
(perfil `preview`).

| Variable | Valor en `dev` | Para qué |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev` | Base del API, sin `/` final |
| `EXPO_PUBLIC_COGNITO_REGION` | `us-east-2` | Región de Cognito |
| `EXPO_PUBLIC_COGNITO_CLIENT_ID` | `20b10a2tnnr69lqlp2sf62orv0` | App Client sin secreto, con `USER_PASSWORD_AUTH` |
| `EXPO_PUBLIC_AUTH_TOKEN_TYPE` | `id` | El autorizador del API REST pide el IdToken |
| `EXPO_PUBLIC_PAYMENTS_START_PATH` | vacío (= `/payments`) | No usar la ruta vieja `/start-payment` |
| `EXPO_PUBLIC_REAL_METHODS` | la lista de `eas.json` | Funciones que van al back real |
| `EXPO_PUBLIC_USE_MOCKS` | vacío | `1` fuerza el modo demo |

Para pasar una función a real: agregar su nombre (el de `NatilleraApi`) a `EXPO_PUBLIC_REAL_METHODS` en `eas.json`
y en tu `.env`, y volver a generar el APK.

## 6. Correr, probar y construir

```bash
npm install
cp .env.example .env        # y completar con la tabla de arriba
npx expo start              # Expo Go: escanear el QR · "w": navegador · "a": emulador Android
npm run typecheck           # tsc estricto (backend/ está excluido)
npm test                    # 15 casos con node:test, sin red
node scripts/ai-usage-check.mjs   # que AI_USAGE.md cubra los commits asistidos
```

APK (Android), con sesión de EAS (`npx eas-cli login`, la hace una persona del equipo):

```bash
npx eas-cli build -p android --profile preview
```

Emulador, celular por USB y problemas de Android: [ANDROID.md](ANDROID.md). Lista de prueba con sesión real en el
APK: [prueba-apk-2026-10-17.md](prueba-apk-2026-10-17.md).

Depurar desde el celular: **Su cuenta → Registro técnico** muestra cada llamada al API (método, ruta, estado y
tiempo). Se puede encender como botón flotante y copiar todo para pegarlo en un issue.

### Guía paso a paso (pantalla 39)

`src/features/guia/`: `guides.ts` (contenido de 8 procesos, mismo texto que el manual de usuario), `GuideSheet.tsx`
(modal con ícono que late, paso que entra deslizado y barra de avance; quieto con `useReducedMotion`; se desplaza con
A+ al máximo), `FirstTimeGuide.tsx` (la oferta la primera vez) y `guideSeen.ts` (procesos ya ofrecidos, en
`SecureStore` con la clave `natillera.guidesOffered`; en web, `localStorage`). Cada pantalla de proceso tiene
`<FirstTimeGuide id="…" />` antes de `</Screen>`; Ayuda las abre directo en los pasos. Para agregar un proceso:
sumarlo a `GUIDE_IDS` y `GUIDES` y poner el componente en su pantalla. Para volver a ver las ofertas en un celular:
borrar los datos de la app.

## 7. Backend

Todo en [backend/README.md](../backend/README.md): arquitectura, las rutas por bloque, estado en `dev`, despliegue
con `infra/*.sh` (AWS CLI, sin IaC, con versión de respaldo de cada Lambda) y pruebas (`npm test` en
`deploy/natilleras` y `deploy/prestamos`). Contrato que llama la app: [openapi.yaml](openapi.yaml).

Antes de tocar el back: leer [backend/CLAUDE.md](../backend/CLAUDE.md) y [backend/docs/COORDINACION.md](../backend/docs/COORDINACION.md).
Solo una persona despliega; los cambios llegan por PR y se despliega desde `main`. Después de un deployment de API
Gateway el stage tarda ~1 min: mientras, cualquier ruta responde 403 «Missing Authentication Token».

Una ruta que responde **401 sin token existe**; una que responde **403 «Missing Authentication Token» no existe**.
Ninguna de las dos cosas prueba que funcione: eso solo lo dice una prueba con sesión y la Test Wallet.

## 8. Convenciones

- TypeScript estricto, sin `any`; `as const` en vez de `enum`. Código en inglés; comentarios, commits y docs en español.
- Una rama por tarea salida de `main` (`feat/…`, `fix/…`, `docs/…`) y PR. El subtree `backend/` se fusiona con
  merge commit, nunca squash ni rebase.
- Textos de la app: «usted», frases cortas, sin jerga técnica ([copy-henry.md](copy-henry.md)). Áreas táctiles ≥ 48 px,
  contraste AA, todo legible con A+ al máximo.
- Toda pantalla funciona en demo y en real.
- **Uso de IA (lo revisa el jurado):** cada tarea asistida suma una fila a [AI_USAGE.md](../AI_USAGE.md) y sus prompts
  literales quedan en `prompts/`. No desactivar el hook `log-prompt`.

## 9. Lo que queda después de la hackatón

- Metas en el back (`/goals`) para que se guarden y las vea toda la familia.
- Cobro programado de la cuota y de las cuotas del préstamo (EventBridge Scheduler); hoy se cobra con `charge-now`.
- Vuelta por página también para los grants (opción A → ruta pública como `return-payment`).
- Deuda de seguridad del back: llaves por usuario en `user-info` (heredado del `start-payment` de Duvan) y rotar las
  llaves de la Test Wallet usadas en la demo.
