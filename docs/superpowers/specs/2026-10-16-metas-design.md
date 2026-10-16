# Metas de la natillera — diseño (2026-10-16)

Idea que nos trajeron en la hackatón: la natillera también sirve para metas puntuales de la familia (un viaje, un regalo, una colecta para un familiar enfermo). Aprobado por Camilo el 2026-10-16.

## Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Modelo | Una sola «Meta» con dos modos: **ahorro** y **colecta** | Mismas pantallas y lógica; solo cambian textos y de dónde sale la plata |
| Back | **Nada nuevo.** Las metas viven en el front (`src/api/goalStore.ts`) | Entrega el sábado 11:00 y el back va atrasado |
| Ahorro | Bolsillo del fondo: se **aparta** plata del fondo (sin billetera); tope = fondo − lo ya apartado | No necesita mover plata ni rutas nuevas |
| Colecta | Pago **p2p real** con `walletAddress` del beneficiario (extensión que el back ya acepta en `POST /payments`) | Muestra Open Payments multimoneda: cada quien paga en su moneda y le llega en la del beneficiario |
| Alcance v1 | Núcleo: sección en la 10, 36 Metas, 37 Nueva meta, 38 Detalle (barra, días, «¿cuánto le toca?», aportar) | Pocas piezas, probadas |

## Límite conocido

El progreso es **por celular**: el back no guarda a qué meta va un pago y `GET /payments` solo devuelve el historial propio, así que los aportes de otros socios no se ven en cada celular. En modo demo no se nota (datos de ejemplo). Para la versión compartida, propuesta al back después de la entrega: guardar un `goalId` opcional en `payments-history` y una consulta por natillera.

## Piezas

| Pieza | Archivo |
|---|---|
| Tipos `Goal`, `GoalContribution`, `CreateGoalInput`; variante p2p con `walletAddress` | `src/api/types.ts` |
| Métodos `listGoals`, `getGoal`, `createGoal`, `addGoalContribution` | `src/api/client.ts`, `mockApi.ts` (con 2 metas de ejemplo), `httpApi.ts` (en memoria) |
| Almacén en memoria compartido | `src/api/goalStore.ts` |
| Cálculos (días, avance, «¿cuánto le toca?» en BigInt) | `src/features/metas/goalMath.ts` |
| Pago de colecta → meta (registro en memoria, como `flow.ts`) | `src/features/metas/goalPayments.ts`, `src/app/billetera/volviendo.tsx` |
| Resultado «Aporte enviado» | `src/app/resultado.tsx` (`meta-aporte`) |
| Pantallas | `src/app/(tabs)/natillera/metas/{index,nueva,[goalId]}.tsx`, sección en `HomeNatillera.tsx` |

## Para la demo real

Hace falta una billetera de la Test Wallet que haga de beneficiario (p. ej. la de alguien del equipo) y crear la colecta con ella; la de ejemplo (`/carmen`) no existe. Falta verificar qué monedas ofrece la Test Wallet: con todas en la misma moneda el pago funciona igual, pero sin conversión.
