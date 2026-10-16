# Guía para Henry · carriles `pagos` y `creditos`

Henry: esta es tu hoja de ruta. Todo lo que necesitas está en el repo; si algo no está, pídelo en "Pedidos entre carriles" de [MEMORY.md](../MEMORY.md) o escríbele a Camilo. El plan completo está en [PLAN.md](PLAN.md).

## Qué es tuyo

| Carril | Pantallas | Qué hace | Depende de |
|---|---|---|---|
| `pagos` | 26, 27, 28, 30, 31, 32, 33 | Pagar a alguien, guardar cuentas, pasarela hacia la billetera y regreso | `base` |
| `pagos` | 11, 34 | Poner la cuota de la natillera y su confirmación | `base` |
| `pagos` | 12, 14 | Activar el cobro automático y su confirmación | `base` |
| `creditos` | 16, 17, 19, 20, 21, 23, 24, 25 | Pedir préstamo, autorizar cuotas, decisión de la tesorera, plan de pagos | `base` y `pagos` |
| `pitch` | — | Slides, guion de 5 min, ensayo | Nada |

Las pantallas 13, 18, 22 y 29 **no se construyen**: son la Test Wallet real. Las tuyas son las que abren la billetera y las que reciben al usuario de vuelta. Los textos exactos de cada pantalla están en [figma-pantallas.md](figma-pantallas.md) y [_figma_raw.txt](_figma_raw.txt); el Figma es https://www.figma.com/design/hK29vkj23AZZXEN7W2hjmA.

## Parte A · Mientras Camilo termina la base (no dependes del código)

El scaffold, el tema y el `apiClient` son la ruta crítica y los hace Camilo; hasta que haga el primer push a `main`, tu tiempo rinde más en esto. Es en orden de prioridad:

| # | Tarea | Por qué importa | Listo cuando |
|---|---|---|---|
| A1 | Crear en la **Test Wallet** (https://wallet.interledger-test.dev) al menos 3 cuentas de prueba (por ejemplo Doña Rosa, Luz y el fondo de la natillera), idealmente en monedas distintas | Sin wallets reales no hay pago de punta a punta, que es la prioridad oficial de la hackatón | Tienes las direcciones (`https://ilp.interledger-test.dev/...`) anotadas en el chat privado del equipo |
| A2 | Anotar **qué monedas ofrece** la Test Wallet y si hay COP | Decide cómo mostramos los pesos en la demo | Respuesta escrita en la bitácora `pagos` de MEMORY.md |
| A3 | Probar si la billetera **acepta `natillera://retorno` como finish URI** (si no, el back debe usar la opción B de [api-contrato.md](api-contrato.md)) | Define cómo vuelve el usuario a la app | Resultado en la bitácora `pagos`; avisar a Duvan |
| A4 | Hacer el curso de Platzi o la Guide to Open Payments | La hackatón lo exige a los 4 | Marcado en el checklist de MEMORY.md |
| A5 | Preparar el entorno: Node LTS, git, un Android (o emulador) con **Expo Go**, el repo clonado y `git config user.name "Henry"` | El hook de prompts usa ese nombre | `git config user.name` devuelve "Henry" |
| A6 | Revisar los textos de las pantallas (tono "usted", frases cortas, sin jerga) y anotar cambios en un archivo `docs/copy-henry.md` | Es el premio de inclusión | Lista de cambios propuestos, sin tocar el Figma |
| A7 | Arrancar las **slides** en la plantilla oficial de Google Slides | Es obligatorio y toma tiempo | Esqueleto con problema, solución, demo, impacto, equipo |

No pegues llaves, contraseñas ni el `private.key` en ningún chat con IA: los prompts se publican.

## Parte B · Cuando Camilo avise "base lista"

Camilo avisará en el chat del equipo y marcará `base` como lista en MEMORY.md. Entonces:

1. `git pull origin main` y `npm install`.
2. Reclama tu carril: escribe tu nombre, la rama y "en curso" en la tabla de Carriles de MEMORY.md.
3. Crea la rama: `git switch -c feat/pagos-<tema>` (por ejemplo `feat/pagos-pagar`).
4. Arranca con `EXPO_PUBLIC_USE_MOCKS=1 npx expo start` y verifica que ves la app con datos de ejemplo.
5. Trabaja pantalla por pantalla contra el `apiClient` (nunca `fetch` desde una pantalla).

### Orden recomendado de `pagos`

| Orden | Entregable | Por qué en este orden |
|---|---|---|
| 1 | Pantallas 28 → 30 → 31/32/33: pasarela, "volviendo de su billetera" y resultados | Es el corazón del pago de punta a punta y lo reutilizan 11, 12 y los préstamos |
| 2 | Pantalla 26 (Pagar) y 27 (guardar cuenta) | Primer flujo completo de pago entre personas |
| 3 | Pantalla 11 → 34 (poner la cuota) | **Es el pago que mostramos en el pitch.** Si el tiempo aprieta, este va antes que el 26 |
| 4 | Pantallas 12 y 14 (recurrente) | Se ve mejor con `charge-now` del back |

### Reglas para tu código

| Regla | Detalle |
|---|---|
| Montos | Siempre `{ value: string, assetCode, assetScale }`; se muestran con `formatAmount` |
| Billetera | Usa `openWallet(api, { redirectUrl, demoTitle, demoDetail })` de `@/api` (por dentro hace `openAuthSessionAsync`; en demo un diálogo hace de billetera). La app jamás firma ni guarda llaves |
| Pantalla 30 | `api.finishPayment(paymentId, ret)` y luego `waitForFinalPayment(api, paymentId)` de `@/api` |
| Modo demo | Toda pantalla debe funcionar con `mockApi` y con `httpApi`. Si te falta un mock, pídelo (ver abajo) |
| Archivos compartidos | No edites `src/theme`, `src/api`, `src/components` ni `src/app/_layout.tsx`. Pídelo en "Pedidos entre carriles" |
| Estilo | TypeScript estricto, sin `any`, `as const` en vez de `enum`; áreas táctiles ≥ 48 px, contraste AA; código en inglés, comentarios y commits en español |
| Diseño | Paleta G y fuentes en [figma-pantallas.md](figma-pantallas.md). Si usas Claude Code, corre `/ui-ux-pro-max` antes de maquetar |

### Cómo pedir algo a otro carril

Una línea en la sección "Pedidos entre carriles" de [MEMORY.md](../MEMORY.md), con este formato, y avisa a Camilo por el chat:

```
2026-10-16 18:30 · de pagos a base: necesito un mock de GET /payments/{id} que pase de pending a completed a los 4 s
```

## Parte C · Préstamos (`creditos`)

Empiezan cuando el flujo de la cuota esté funcionando, porque reutilizan la pasarela (28, 30, 31–33). Camilo se suma en la madrugada. Orden: 16 (pedir y simular) → 17/19 (autorizar cuotas) → 20/21/23/25 (esperar y decisión de la tesorera) → 24 (plan de pagos). Las tasas, el tipo de amortización y el periodo de la cuota **no los definimos nosotros**: se pintan tal como los devuelve el back.

## Cómo trabajamos en equipo

| Cuándo | Qué haces |
|---|---|
| Cada ~3 h | Rebasa o fusiona `main` en tu rama, abre PR a `main` y avisa a Camilo. Nada de ramas largas |
| Al cerrar cada tarea | Agrega una fila a "Where and How We Used AI" de [AI_USAGE.md](../AI_USAGE.md) (fecha, persona, herramienta, qué, archivos) y una línea a tu bitácora en MEMORY.md |
| Commits | En español, claros; con el trailer `Co-Authored-By` si los asistió una IA |
| Si usas otra IA (ChatGPT, Copilot, Gemini…) | Pega el prompt literal en `prompts/henry-<herramienta>.md` en el momento |
| Push y PR | Con el OK de Camilo hasta que el flujo esté rodando |
| Si te trabas más de 20 min | Escribe en el chat del equipo: es más barato que seguir solo |

## Definición de "pantalla terminada"

| Criterio | Cómo se prueba |
|---|---|
| Se ve como el Figma, con los textos de [figma-pantallas.md](figma-pantallas.md) | Comparación visual |
| Funciona en modo demo y en modo real | Se recorre con `EXPO_PUBLIC_USE_MOCKS=1` y sin él (cuando el back esté) |
| Sin errores en consola ni en `npx tsc --noEmit` | Comando |
| Usable con el botón A+ activo y con una mano | Prueba en el celular |
| Estados de carga, vacío y error cubiertos | Se fuerzan con el mock |

## Cómo usar la base

Esqueleto de una pantalla con los componentes compartidos. Reemplaza el `Placeholder` del archivo de tu ruta.

```tsx
import { router } from 'expo-router';
import { useState } from 'react';

import { openWallet, useApi, useMyNatillera } from '@/api';
import { Button, Card, InfoRow, Screen } from '@/components';
import { amount } from '@/utils/money';

export default function ScreenNatilleraCuota() {
  const api = useApi();
  const { data: natillera } = useMyNatillera();
  const [loading, setLoading] = useState(false);

  async function pay() {
    if (!natillera) return;
    setLoading(true);
    const start = await api.startPayment({ kind: 'aporte', natilleraId: natillera.natilleraId, amount: natillera.quota });
    const outcome = await openWallet(api, { redirectUrl: start.redirectUrl, demoTitle: 'Poner la cuota', demoDetail: 'Sale de su billetera…' });
    setLoading(false);
    if (outcome.kind === 'returned') router.replace({ pathname: '/billetera/volviendo', params: { paymentId: start.paymentId, ...outcome.ret } });
  }

  return (
    <Screen title="Poner la cuota" inTabs footer={<Button label="Poner la cuota" onPress={pay} loading={loading} />}>
      <Card title="Resumen">{natillera ? <InfoRow label="Llega a la natillera" amount={natillera.quota} /> : null}</Card>
    </Screen>
  );
}
```

| Necesitas | Usa |
|---|---|
| Estructura de pantalla con título, A+ y botones abajo | `Screen` (`inTabs` si está dentro de las pestañas, `footer` para los botones) |
| Pantallas ✓ ✕ ! y "volviendo…" | `ResultScreen` con `kind` = `success`, `rejected`, `error` o `loading` |
| Montos | `InfoRow` con `amount` (verde con `tone="money"` solo si es plata que entra) |
| Opciones (Mía / Doña Rosa, 2 / 4 / 6 cuotas) | `Choice` |
| Campos | `TextField` (etiqueta siempre visible, `error` junto al campo) |
| Datos | `useMyNatillera()`, `usePayments()`, `useAccounts()`, `useMyLoans()`; después de un pago, `queryClient.invalidateQueries({ queryKey: keys.natillera })` |
| Probar como otra persona en demo | Entra con `luz` o `andres` en "Ya tengo cuenta" (cualquier contraseña) cuando la pantalla 03 exista |

## Pendientes de Henry (estado al 2026-10-16 ~12:40)

> **12:50:** los pendientes ya están repartidos en sesiones paralelas con horario y encargos en [SESIONES-HENRY.md](SESIONES-HENRY.md). La fusión de `main` en `feat/pagos` ya está hecha (`da44d32`).

Camilo cerró en demo los carriles `cuenta-natillera` (ya en `main`) y `pagos` (en la rama `feat/pagos`, sin PR). Esto es lo que queda para ti, en orden. La misma lista vive en [MEMORY.md](../MEMORY.md), sección "Pendientes para Henry".

| # | Pendiente | Cómo | Listo cuando |
|---|---|---|---|
| 1 | Probar el camino del pitch **11 → 28 → 30 → 34** en Expo Go y en web | `git switch feat/pagos`, `npm install`, `EXPO_PUBLIC_USE_MOCKS=1 npx expo start`. En web, el diálogo de la billetera demo usa `window.confirm` | Recorrido completo sin errores en consola; fallos en la bitácora `pagos` |
| 2 | Parte A de esta guía (wallets de prueba, monedas/COP, `natillera://` como finish URI) | Test Wallet | Respuestas en la bitácora `pagos`; avisar a Duvan |
| 3 | **Préstamos 16–25** (carril `creditos`) | Rama `feat/creditos` desde `main` cuando `pagos` esté integrado. Reutiliza `antesHref` / `volviendoHref` de `src/features/pagos/flow.ts`. Para 19 y 23 agrega `'credito-autorizado'` y `'prestamo-desembolsado'` a `ResultKind` y una entrada en `VARIANTS` de `src/app/resultado.tsx` (TypeScript marca lo que falte); en `src/app/billetera/volviendo.tsx` añade la rama `finishLoanRepaymentGrant` / desembolso | Pantallas 16, 17, 19, 20, 21, 23, 24 y 25 navegables en demo |
| 4 | Copy: revisar tono "usted" y frases cortas | `docs/copy-henry.md` con propuestas; no tocar el Figma | Lista entregada a Camilo |
| 5 | Slides en la plantilla oficial y guion de 5 min | Google Slides | Problema, solución, demo, impacto, equipo |
| 6 | Curso de Platzi o Guide to Open Payments | — | Marcado en el checklist de MEMORY.md |
| 7 | Mejoras menores de `cuenta-natillera` en celular: instalar `expo-clipboard` para "Copiar el enlace" (hoy solo abre Compartir) y botón volver en pantallas sueltas | Rama nueva desde `main` | Probado en Expo Go |

**Antes de integrar `feat/pagos` a `main`:** chocan `AI_USAGE.md`, `MEMORY.md` y `prompts/2026-10-16-camilo.md`. Conserva las dos versiones de las filas y de la bitácora, y **concatena** los prompts (nunca descartes ninguno). La rama tampoco trae la fusión de `main` (hook de prompts por rama y `Screen` con `headerRight`): haz `git merge main` en `feat/pagos` primero. El PR lo abre Camilo.

**Nota de pagos a base:** `src/api/wallet.ts` ganó un fallback `window.confirm` para que `openWallet` funcione en web; y `mockApi.ts` (~línea 137) devuelve `fee` aunque no haya conversión (la UI ya lo oculta). Ambos están en "Pedidos entre carriles".

**Hecho (Henry, 14:05):** `app.json` `web.output` pasó de `"server"` a `"single"`; reversible si Camilo prefiere SSR.
