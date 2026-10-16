# Integración para Camilo · Expo Go (2026-10-16 ~13:50)

De Henry a Camilo. Todo lo de Henry está en **una sola rama**, lista para el PR a `main`. Este documento dice qué trae, cómo probarla en Expo Go y qué queda abierto.

> **15:45 (manda sobre lo de abajo):** la rama ya está **en el repo del equipo**: `origin/feat/cuenta-celular` (`b7729fa`, ahora con `feat/creditos` fusionada; 22 commits por delante de `main`, 0 por detrás). PR: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/main...feat/cuenta-celular · **Las pruebas en Expo Go las hace Camilo en su PC** (Henry no tiene Expo Go): la lista de 8 pruebas de abajo es para él.

> **14:05:** las dos sesiones de Henry quedaron sincronizadas en `feat/creditos` (`093986f`): entraron los arreglos de `base` de la auditoría (`RevokeToken`, `friendlyError`, `.env*`, hook), `npm test` (8/8), región Cognito `us-east-2` por defecto y `web.output` estático. `tsc` limpio.

## La rama

| Dato | Valor |
|---|---|
| Rama | `feat/cuenta-celular` (= `feat/creditos` + pulido en celular) en el repo del equipo (copia igual en el fork de Henry) |
| PR a `main` | https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/main...feat/cuenta-celular |
| Base | Contiene tu `main` completo hasta `32eb791`: el PR entra sin conflictos |
| Rama solo-Cognito | `feat/auth-signup` en el mismo fork, por si prefieres el registro en un PR aparte |

Si prefieres traerla por terminal en vez de PR:

```bash
git fetch origin
git switch main && git merge --no-ff origin/feat/cuenta-celular && git push origin main
```

## Qué trae

| Bloque | Pantallas / archivos | Estado |
|---|---|---|
| Pagos (tu sesión B) + fusión de `main` | 11, 12, 14, 26–28, 30–34 | Demo OK |
| Seguridad de la pasarela (auditoría) | `src/features/pagos/flow.ts`, 28, 30, `resultado.tsx` · detalle en [auditoria-2026-10-16.md](auditoria-2026-10-16.md) | Demo OK |
| Préstamos (`creditos`) | 16, 17, 19, 20, 21, 23, 24, 25 · `src/app/(tabs)/natillera/prestamos/*`, `src/features/creditos/` | Demo OK |
| Registro Cognito (tu encargo) | `src/api/auth.ts`, `httpApi.ts`, `types.ts`, pantalla 02, `.env.example`, `api-contrato.md` | `tsc` OK · **falta Cognito real** |
| Pulido en celular | `expo-clipboard` en 09, `src/features/navegacion/BackButton.tsx` en las pantallas apiladas, textos de más impacto de `copy-henry.md`, aviso de espera en 30 | Demo OK |
| Documentos | [copy-henry.md](copy-henry.md), [pruebas-2026-10-16.md](pruebas-2026-10-16.md), [revision-codigo-2026-10-16.md](revision-codigo-2026-10-16.md), [pitch/GUION.md](pitch/GUION.md), [pitch/CONTEXTO.md](pitch/CONTEXTO.md), [SESIONES-HENRY.md](SESIONES-HENRY.md) | Borradores para revisar |

### Cambios en archivos compartidos (`src/api`) — para que los revises

| Archivo | Cambio | Por qué |
|---|---|---|
| `src/api/auth.ts` | `signUp()` directo a Cognito; helper `cognito()` con error de red en "usted"; token vencido sin refresh se borra | Tu encargo + hallazgo 18 de la revisión |
| `src/api/httpApi.ts` | `signup` = SignUp + login; `verifyWallet` sin sesión consulta la **dirección de pago pública** de Open Payments (GET con `Accept: application/json`) | Sin esto nadie puede registrarse en modo real: la 02 exige verificar la billetera y `GET /wallets/verify` pide token que todavía no existe. No firma ni usa llaves |
| `src/api/types.ts` | Comentarios del formato de `SignupInput` | Documentar +57, política de contraseña y `custom:walletId` |
| `src/api/wallet.ts` | Fallback `window.confirm` del modo demo en web | Ya estaba en "Pedidos entre carriles" desde la sesión B |

Lo único de `src/api` que **no** se tocó porque no estaba autorizado: `config.ts` (ver "Abierto").

## Verificado (2026-10-16 ~13:45, rama `feat/creditos`)

| Prueba | Resultado |
|---|---|
| `npx tsc --noEmit` | Limpio |
| `node scripts/ai-usage-check.mjs` | OK |
| `npx expo-doctor` | 18/20; los 2 que fallan necesitan internet a `exp.host` (no hay salida desde la nube) |
| Recorrido automático en web, modo demo, 412×900 | Sin errores de consola en: 01 → 10 → 11 → 28 → 34 (pitch) · 16 → 17 → 19 → 20 → 21 → 23 → 24 (préstamos) · 26 → 28 → 31 (pagar) · 12 → 14 (recurrente) · validaciones de la 02 |

No se pudo probar contra Cognito ni contra la Test Wallet: ni la nube ni la VM de Henry tienen salida a AWS ni a `interledger-test.dev`. Eso es lo primero en Expo Go.

## Cómo probar en Expo Go

```bash
git switch feat/creditos   # o main ya fusionado
npm install
cp .env.example .env       # trae us-east-2 y el ClientId público
# en .env: EXPO_PUBLIC_API_URL=<URL de API Gateway del back> (vacío = modo demo)
npx expo start             # escanear el QR con Expo Go
```

En Expo Go la billetera devuelve a `exp://<IP>:8081/--/retorno` (no a `natillera://retorno`): la app lo arma sola con `Linking.createURL('retorno')`. **El back debe aceptar ese `returnUrl`** además de `natillera://retorno`.

### Lista de pruebas (en este orden)

| # | Prueba | Esperado |
|---|---|---|
| 1 | Modo demo: "Empezar con datos de ejemplo" y el camino del pitch | Igual que en web |
| 2 | 02 · billetera real de la Test Wallet → "Verificar la billetera" | Muestra la moneda. Si falla, revisar que la URL responda JSON al `GET` |
| 3 | 02 · registro real (usuario nuevo, `+57` + 10 dígitos, contraseña tipo `Clave#2026`) | Entra solo a la app |
| 4 | 02 · usuario repetido | "Ese usuario ya existe. Elija otro." |
| 5 | 02 · wallet falsa (si pasa la verificación) o correo/teléfono ya usados | «No encontramos esa billetera…», «Ese correo ya tiene una cuenta.» o «Ese teléfono ya tiene una cuenta.» (nunca "PreSignUp failed…"; probado por terminal el 16/10 ~16:00) |
| 6 | 03 · login con clave mala | "Usuario o contraseña incorrectos." |
| 7 | 11 → 28 → Test Wallet → 30 → 34 con el back | Cuota puesta y aporte en "Lo último que pasó" |
| 8 | Préstamo completo con dos usuarios (uno pide, la tesorera aprueba) | 16 → 17 → 19 · 21 → 23 · 24 |

## Abierto

| Quién | Qué |
|---|---|
| ~~Camilo (`base`)~~ | ~~`config.ts` región~~ **Hecho por Henry:** `us-east-2` por defecto |
| ~~Camilo (`base`)~~ | ~~`web.output`~~ **Hecho por Henry:** `"single"` (estático, probado); reversible |
| ~~Camilo (`base`)~~ | ~~Pendientes de la auditoría~~ **Hechos por Henry:** `RevokeToken` al salir, `.gitignore` con `.env*`, patrones extra en el hook |
| Back | Todo lo del back, priorizado y con formatos JSON: [COORDINACION-BACK.md](COORDINACION-BACK.md) |
| Camilo | APK: `eas.json` (perfil `preview`) ya está; `npx eas-cli build -p android --profile preview` con su cuenta de Expo |
| Henry | Test Wallet (3 cuentas, ¿COP?, ¿`natillera://` como finish URI?), curso, slides con [pitch/GUION.md](pitch/GUION.md) |
| Henry | Pulido hecho en `feat/cuenta-celular` (copiar invitación, botón volver, textos de más impacto); el resto de [copy-henry.md](copy-henry.md) queda como propuesta |
