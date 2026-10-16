# Auditoría del front · 2026-10-16 ~12:30 (Henry)

Revisión con 4 agentes (verificación y pruebas con Claude Sonnet 5.5, coordinación y ciberseguridad con Claude Opus 5.5) sobre el carril `pagos`. Este archivo resume lo que encontraron y qué quedó hecho; lo pendiente está en "Pedidos entre carriles" de [MEMORY.md](../MEMORY.md).

## Lo que ya quedó arreglado (rama de Henry sobre `feat/pagos`)

| Hallazgo | Riesgo | Arreglo |
|---|---|---|
| Expo Router abre cualquier pantalla por enlace; la 28 abría el `redirectUrl` que llegara por params | Phishing: `natillera://billetera/antes?redirectUrl=https://falsa` abre una billetera falsa | `antesHref` registra el flujo en memoria; la 28 usa la URL del registro y exige https de `*.interledger-test.dev` (en demo no aplica) |
| `/resultado?tipo=pago-hecho` mostraba un pago falso con montos inventados | Estafa del tipo "ya le pagué" | Los éxitos y sus montos salen del registro que llena la 30 (`settleFlow`); sin él se muestra «sigue en proceso» |
| La 30 se podía disparar por enlace con un `id`/`interact_ref` elegidos por otro | Finalizar un pago ajeno con la sesión de la víctima | La 30 solo finaliza flujos iniciados en esta sesión |
| `origin` en params se usaba como ruta | Navegación a cualquier pantalla | `safeOrigin()`: lista blanca de rutas |
| Error de red al confirmar → «No salió plata» | Mentira si el back sí cobró; la persona repite el pago | Ahora «Su pago sigue en proceso, revise «Sus pagos»» |
| Botón atrás de Android en la 30 | Salir a mitad de la confirmación | `BackHandler` en la 30 |

Regla para préstamos (16–25): **siempre** navegar a la 28 con `antesHref(...)` (es lo que registra el flujo). Para 19 y 23, además de `ResultKind`, agregar los nuevos éxitos al conjunto `SUCCESS` de `src/app/resultado.tsx`.

## Front compartido (carril `base`) · **hecho por Henry el 2026-10-16 ~13:00**

- `src/api/auth.ts`: el logout es solo local; llamar `RevokeToken` de Cognito antes de borrar tokens.
- `src/api/httpApi.ts`: si el back devuelve HTML (502), `JSON.parse` revienta; mapear errores por status y no mostrar `message` crudo.
- `.gitignore`: usar `.env*` + `!.env.example` (hoy no ignora `.env.production`).
- `.claude/hooks/log-prompt.mjs`: agregar patrones `clave`, `pass`, `pwd`, secretos AWS de 40 caracteres y cadenas base64 largas.

## Pendiente del back (Duvan y David)

- Opción B: `finish.uri` https del back que verifique el hash GNAP y responda 302 a la app; hash obligatorio y `/finish` idempotente si se queda la opción A.
- `returnUrl`: aceptar solo una lista exacta (`natillera://retorno`, `exp://…/--/retorno`).
- Ignorar `result` que manda el cliente: el estado lo decide el back.
- Validar que el `paymentId` sea del usuario del token.
- Estado del repo back a las 12:15: solo docs en la rama `david`; sus rutas tentativas difieren del contrato (`/payments/start`, `/payments/finish` con `paymentId` en el body, `/natilleras/savings`, `/accounts/pay`, `/recurring/start`) y faltan `GET /payments/{id}`, `charge-now`, `returnUrl` y `debitAmount`/`receiveAmount` al iniciar. Hay que acordar rutas finales y `natilleraId` (no `natilleraID`).

## Pruebas

- `tsc --noEmit` limpio; bundle Android ok.
- Unitarias de `money.ts` y de la lógica del flujo, y simulación con `mockApi`: cuota ok/rechazada y p2p ok/rechazado sin duplicar aportes. Observación: `toMinorUnits` ignora el signo (`-500` → 500).
- No se encontraron secretos en el repo ni en el historial.
- Falta: recorrer en celular con Expo Go y el pago real con la Test Wallet.
