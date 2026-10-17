# Mensaje para Duvan — `start-payment` (17/10, madrugada)

> **Histórico (03:25):** resuelto. `start-payment` ya funciona en el `main` del back (PR #7, 02:03). Estado vigente en [estado-2026-10-17-madrugada.md](estado-2026-10-17-madrugada.md).

Duvan, revisamos el error de la librería en `start-payment`. Te dejo el diagnóstico y una propuesta para llegar a la demo con el pago funcionando.

## 1. El error de la librería (`ENOENT … specs/wallet-address-server.yaml`)

- **Causa:** al crear el cliente, `@interledger/open-payments` valida por defecto cada respuesta contra sus especificaciones OpenAPI y lee esos `.yaml` del disco (`dist/openapi/specs/`). esbuild empaqueta el JS pero no copia los `.yaml`, así que en la Lambda no existen.
- **Lo reproduje** con la 7.4.0 empaquetada igual que en la Lambda: con `validateResponses: true` sale el mismo `ENOENT`, y con `validateResponses: false` el cliente se crea bien.
- **Está documentado:** el README del paquete describe la opción `validateResponses` («Defaults to `true`»). El issue oficial [interledger/open-payments#505](https://github.com/interledger/open-payments/issues/505) muestra el mismo `ENOENT` (allí por rutas en Windows) y propone `validateResponses: false` como salida rápida.
- **Arreglo:**

  ```ts
  createAuthenticatedClient({ walletAddressUrl, privateKey, keyId, validateResponses: false })
  ```

  La versión del repo (`deploy/payments/src/shared.ts`) ya lo tiene.

## 2. Lo que vimos en la versión que subiste a las 23:29

1. **Lee llaves privadas de cada usuario en `user-info`** (`walletInfo.walletKeys`). Esto es lo más grave:
   - Una llave privada en DynamoDB queda en texto plano. Cualquiera con permiso de lectura sobre la tabla podría firmar pagos.
   - Open Payments no funciona así. Usa **una sola llave, la del cliente** (nuestra app, `natillera/open-payments-client` en Secrets Manager). Cada persona autoriza el pago en su billetera con el grant interactivo (GNAP), así que nunca necesitamos las llaves de los usuarios.
   - Además, el `pre-signup` no guarda ese campo, así que fallaría igual.
2. **Lee `event.walletAddress` y `event.amount`**, pero la plantilla VTL manda los datos en `event.body`.
3. **No pide `interact.finish`**. Sin eso la billetera no vuelve a la app (`natillera://retorno`) y `finish-payment` nunca recibe el `interact_ref`.
4. **No guarda el pago en `payments-history` ni devuelve nada.** La app espera `{ paymentId, redirectUrl, debitAmount, receiveAmount }`. Sin eso no funcionan `finish`, `return` ni `get`, y los aportes no suman al fondo.

En la versión de `duvdev` (15:43) también hay detalles: región `us-east-1` (todo está en `us-east-2`), `getSecrets` devuelve el texto sin `JSON.parse` y la consulta usa `Query` sobre `user-info`, que el rol no tiene permitido (por eso el 502 que vio Camilo con `prueba3`).

## 3. Propuesta

**Volver a desplegar el `start-payment` del repo** (rama `david`, `deploy/payments`). Es el que hizo el pago real EUR → COP a las 21:32 y ya trae:

- un solo secreto (`OP_SECRET_ID = natillera/open-payments-client`, `us-east-2`);
- `validateResponses: false`;
- lectura de `event.body`, `interact.finish` con la lista exacta de `returnUrl` y el registro en `payments-history`;
- `kind: 'aporte'` con natillera y la respuesta que espera la app.

**Tu versión no se pierde:** se publica como versión numerada de la Lambda (debería quedar como la 6) antes de subir el zip y se puede restaurar en un clic.

Pasos (unos 2 minutos):

```bash
aws lambda publish-version --function-name start-payment --description "Duvan 23:29 (respaldo)" --region us-east-2
cd deploy/payments && npm ci && node build.mjs
aws lambda update-function-code --function-name start-payment --zip-file fileb://dist/start-payment.zip --region us-east-2
```

Handler: `index.handler`. Después Camilo prueba con `prueba3`: cuota → Test Wallet → regreso → estado final.

Si prefieres seguir con la tuya, lo mínimo para que funcione con la app es lo de la sección 2. Todo eso ya está resuelto en `deploy/payments/src/start-payment.ts` y `shared.ts`, por si quieres tomarlo de ahí.

**Necesito tu OK antes de las 08:00** para grabar el video de respaldo con el pago real. ¿Desplegamos la del repo?

— Henry
