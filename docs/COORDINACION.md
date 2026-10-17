# Coordinación del equipo — cómo trabajar en paralelo sin pisarnos

Vigente desde 2026-10-17 (madrugada). Estado detallado: [MEMORY.md](../MEMORY.md) → "Foto al 2026-10-17".
Requests de prueba: [CURLS.md](CURLS.md). Qué pasó esta noche: [REPORTE-DUVAN.md](REPORTE-DUVAN.md).

Esta noche se cayeron los pagos tres veces por cambios cruzados sin avisar:
- se subió código a la Lambda equivocada (`pre-signup`);
- se quitó `PowerUserAccess` del rol;
- se borró y recreó `payments-history` con otro esquema.

Estas reglas existen para que no vuelva a pasar.

## 1. Quién es dueño de qué

Solo el dueño despliega lo suyo. Si necesitas cambiar algo de otra persona, pídeselo o abre un PR.

| Pieza en AWS | Dueño | Cómo se despliega |
|---|---|---|
| `start-payment`, `finish-payment`, `return-payment`, `get-payment` | **David** (código de `start-payment`: Duvan, con `[fix]`) | `infra/deploy-payments.sh` |
| `pre-signup`, Cognito | **David** | consola (`deploy/pre-signup/index.mjs`) |
| Bloque A: `get-me`, `verify-wallet`, `save-account`, `list-accounts`, `create-natillera`, `get-my-natillera`, `join-natillera`, `get-invitation` (+ multi) | **Camilo** | `infra/deploy-natilleras.sh` |
| Préstamos: `simulate-loan`, `request-loan`, `list-loan-requests`, `get-my-loans`, `decide-loan` | **Henry** escribe, **David** despliega | `infra/deploy-prestamos.sh` |
| Nueva `payments-quote` (`POST /payments/quote`) | **David** (Duvan no está) | `infra/deploy-payments.sh` |
| Tabla `payments-history` (`source` + `id`) | **Duvan** (sus eventos) | — |
| Tablas `natillera-payments`, `user-info` | David | — |
| `natillera-registration`, `saved-accounts`, `natillera-records` | Camilo (`natillera-records` la escribe pagos) | — |
| `natillera-loan-request` | Henry / David | — |
| **Rol `PowerUserRole`**, **stage `dev`**, **autorizador** | **Compartidos: nadie los toca sin avisar** | — |

## 2. Reglas de oro

1. **Nada se cambia en AWS desde la consola** si existe el script: los cambios van por el repo (rama → PR
   a `david`) y se despliegan con el script de `infra/`. La consola solo se usa para **mirar** (logs,
   configuración).
2. **Avisar en el grupo ANTES** de tocar algo compartido. Formato del aviso:
   «voy a desplegar X / cambiar Y, ~N min». Al terminar: «listo, versión de respaldo N».
3. **Nunca borrar ni recrear una tabla.** Si necesitas otro esquema, crea **otra tabla** con otro nombre.
4. **Nunca quitar políticas del rol** (`detach-role-policy`, `delete-role-policy`). Si falta un permiso,
   se **agrega** una política inline nueva con un nombre propio (p. ej. `quote-secrets`).
5. **Antes de reemplazar una Lambda, publica una versión de respaldo** (los scripts ya lo hacen):
   `aws lambda publish-version --function-name <nombre> --description "respaldo antes de …"`.
6. **Revisa el nombre de la Lambda** dos veces antes de subir un zip.
7. **Nunca** poner llaves privadas, tokens o contraseñas en código, logs (`console.log`), DynamoDB, el
   repo o el chat. La única llave del backend vive en Secrets Manager: `natillera/open-payments-client`.
8. **Un despliegue a la vez en el stage `dev`.** Después de `create-deployment`, el stage tarda ~1 min:
   mientras tanto las rutas nuevas responden 403.
9. Para leer un secreto: solo nombres bajo `natillera/…`. La SCP de la organización bloquea otros
   (p. ej. `prueba1`) y **eso no se arregla con IAM**.

## 3. Git

- Ramas de trabajo salen de **`david`** y vuelven a `david` por **PR**: `feat/<tema>` o `fix/<tema>`.
  `main` es la rama de entrega: solo recibe PRs de `david`.
- Antes de empezar: `git pull origin david`. Antes del PR: vuelve a traer `david` y resuelve conflictos.
- Los zips de `dist/` chocan siempre en los merges: quédate con cualquiera y **vuelve a compilar**
  (`npm run build`) después de resolver.
- Cada PR dice: qué Lambdas/rutas/tablas toca, si cambia permisos y cómo se probó.
- Commits hechos con IA: `Co-Authored-By: Claude …`. Prompts literales en `/prompts`, y una línea en `AI_USAGE.md`.

## 4. Antes de desplegar (checklist)

```bash
aws sts get-caller-identity --query Account --output text        # 349607459198
aws lambda get-function-configuration --function-name <nombre> --query '[LastModified,Environment.Variables]'
```

- [ ] Avisé en el grupo.
- [ ] `npm test` y `npm run build` pasan.
- [ ] Revisé que nadie desplegó la misma Lambda hace poco (`LastModified`).
- [ ] El script publica versión de respaldo (o la publiqué yo).
- [ ] Después: 401 sin token en mis rutas y una prueba con token/invoke. Avisé el número de versión.

**Volver atrás** si algo se daña:

```bash
aws lambda get-function --function-name <nombre> --qualifier <versión> --query Code.Location --output text
```

(descargar ese zip y subirlo con `update-function-code`).

**Ver errores:**

```bash
aws logs tail /aws/lambda/<nombre> --since 10m
```

## 5. Qué hace cada uno ahora

### David (CLI)
1. ✅ `infra/deploy-natilleras.sh` ya incluye logs y secrets en `natilleras-dynamo` (antes los borraba).
2. PR `david → main` con lo último (arreglo de `start-payment`, tabla nueva y esta guía).
3. **`POST /payments/quote`** (`previewQuote` del front), basado en la fase 1 de Duvan: incoming payment + quote
   con la llave del cliente, sin guardar nada → `{ debitAmount, receiveAmount, expiresAt }`.
4. Revisar y desplegar lo que entregue Henry (préstamos) y el PR de multi-natillera de Camilo.

### Camilo (CLI + app)
1. **Varias natilleras (bloque A):**
   - Trae `david` a `feat/natilleras-multi`: `git merge origin/david`. Hay conflicto en
     `infra/deploy-natilleras.sh`: **conserva los bloques `Logs` y `Secrets`** de la política.
   - Corre `npm test`, recompila y abre el PR a `david`. David lo revisa.
   - Despliégalo **tú** con `infra/deploy-natilleras.sh`, avisando antes: tarda ~30–40 min.
     No toca pagos ni préstamos.
2. **Prueba real de aporte** desde la app (o `CURLS.md` §3):
   - `prueba3` se une a "Familia Ciro" (`FAMILIA-Z9BR-J4TX`).
   - Hace un aporte en **COP** (moneda del fondo) y aprueba con la cuenta dueña de la wallet de `prueba3`.
   - Se verifica que suba `fundTotal` en `GET /natilleras/mine`.
   - Luego pide un préstamo (`CURLS.md` §16).
3. Si la Test Wallet muestra "Internal Server Error" al aceptar: **no es fallo**; revisa `GET /payments/{id}`.

### Duvan (cuando vuelva)
1. Leer [REPORTE-DUVAN.md](REPORTE-DUVAN.md) §9.
   - `start-payment` ya es **tu código** con 6 `[fix]` (`deploy/payments/src/start-payment-duvan.ts`).
   - Si lo cambias, hazlo en ese archivo y por PR.
   - **No** vuelvas a leer llaves de `user-info` ni a escribir en `payments-history` desde el flujo de pagos:
     eso rompe `return-payment`, que completa el pago.
2. `POST /payments/quote` lo hizo David a partir de tu fase 1. Revísalo.
3. Préstamos fase 2 (diseño), si queda tiempo:
   - desembolso = pago del fondo al socio, que aprueba la ADMIN dueña de la wallet del fondo;
   - cuotas = grant con `interval`.

   Ver `docs/API-PRESTAMOS.md` §Fase 2.

### Henry (front + docs)
1. Front: conectar como reales `simulateLoan`, `requestLoan`, `getMyLoans` y `listPendingLoanRequests`.
   `decideLoan`, el recurrente y la fase 2 se quedan **en modo demo**.
2. `openapi.yaml` y README:
   - préstamos (con `natilleraId` opcional);
   - multi-natillera cuando Camilo lo despliegue;
   - monto **en la moneda de quien recibe** en `POST /payments`.
3. AI_USAGE y `/prompts` de todos (Duvan: sección y prompts si usó IA).
4. Video (última prioridad). Para el pago real: pagar en COP a `melos` o a la natillera y aprobar con la
   cuenta dueña de la wallet que paga.

## 6. Qué NO hacer

- ❌ Correr `infra/deploy-payments.sh` sin avisar a David: redespliega las 4 Lambdas de pagos.
- ❌ Fusionar o correr el PR #6 (ya está cerrado): devolvía los pagos a `payments-history`.
- ❌ Borrar o recrear tablas, ni quitar políticas del rol.
- ❌ Guardar llaves en DynamoDB o imprimirlas en logs.
- ❌ Desplegar a la vez que otra persona en el mismo stage.
