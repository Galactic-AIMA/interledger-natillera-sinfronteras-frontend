# Paquetes listos para Lambda

Generados con `npm run build` desde `../src/*.ts` (TypeScript + esbuild). **No se edita aquí:**
el código para revisar está en [`../src`](../src).

| Zip | Lambda | Handler |
|---|---|---|
| `start-payment.zip` | `start-payment` | `index.handler` |
| `finish-payment.zip` | `finish-payment` | `index.handler` |
| `get-payment.zip` | `get-payment` | `index.handler` |

En la consola: Lambda → *Código* → **Actualizar ▼ → Archivo .zip** → subir el zip → Guardar.
No pegar el `.ts` en el editor (Lambda no ejecuta TypeScript). Detalle en `docs/API-PAGOS.md`.
