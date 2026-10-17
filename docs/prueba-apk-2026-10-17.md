# Prueba completa en el APK — 17/10, antes de las 11:00

Que una ruta responda **401 sin sesión** solo prueba que existe en API Gateway. No prueba que la Lambda, Open Payments
y la vuelta a la app funcionen. Esta lista es la prueba de verdad: **con sesión iniciada, en el APK** (perfil `preview`
de `eas.json`) y aprobando en la **Test Wallet** (`https://wallet.interledger-test.dev`).

Lo único que ya se probó así: registro, entrada, crear natillera y poner la cuota (aporte de 50.000 COP, 04:03).

## Antes de empezar

- Dos cuentas con billetera de la Test Wallet con saldo: **A = tesorera** (creó la natillera) y **B = socia** (se unió
  con el código). La billetera del fondo es la de A.
- APK instalado desde la build `preview` (no Expo Go: el retorno `natillera://retorno` es el del APK).
- En cada paso anotar: ✅ / ❌, la hora y, si falla, el texto exacto que mostró la app. El registro técnico del perfil
  dice qué ruta respondió qué.
- Mirar el saldo en la Test Wallet **antes y después** de cada paso que mueve plata.

## 1. Pago real (prioridad 1: es la demo del pitch)

| # | Quién | Pasos | Debe pasar |
|---|---|---|---|
| 1.1 | B | Natillera → «Poner la cuota» → ver la vista previa → Confirmar → aprobar en la Test Wallet | Vuelve sola a la app en < 2 s y la 30 termina en «Listo». La cuota aparece en el fondo y en el historial |
| 1.2 | B | Pagar → a una billetera (p. ej. `https://ilp.interledger-test.dev/cirocol`) → monto → esperar ~1 s | La vista previa sale una vez (no por cada tecla) y muestra lo que llega en la otra moneda |
| 1.3 | B | Confirmar 1.2 y aprobar | Mismo resultado que 1.1; el saldo baja en la Test Wallet de B |
| 1.4 | B | Pagar a `https://ilp.interledger-test.dev/carmen` (no existe) | «La billetera de quien recibe no existe.», sin «Internal Server Error» |
| 1.5 | B | Repetir 1.1 y **rechazar** en la Test Wallet | La app dice que no salió plata; el saldo no cambia |

## 2. Cuota automática (lo más nuevo, nunca probado con sesión)

| # | Quién | Pasos | Debe pasar |
|---|---|---|---|
| 2.1 | B | Natillera → «Que se cobre sola» → «Activar la cuota automática» → aprobar el permiso en la Test Wallet | Vuelve a la app y queda activa. En la Test Wallet aparece el permiso con tope por cobro (cuota + 5 %) |
| 2.2 | B | «Cobrar ahora (demostración)» | «Se cobró la cuota de demostración.»; el saldo de B baja una cuota y el aporte sale en el historial y en el fondo |
| 2.3 | B | «Cobrar ahora» otra vez | Cobra de nuevo mientras queden repeticiones; si no, un aviso claro (`GrantExhausted`), no un error genérico |
| 2.4 | B | Activar y **rechazar** el permiso | No queda activa y no sale plata |

## 3. Préstamo con permiso de cobro y desembolso (fase 2, lo hace Ciro)

| # | Quién | Pasos | Debe pasar |
|---|---|---|---|
| 3.1 | B | Préstamos → simular 20.000 en 3 cuotas → «Pedir el préstamo» | La solicitud queda pendiente |
| 3.2 | B | «Autorizar las cuotas» → aprobar en la Test Wallet | Vuelve a la app; la solicitud queda «cuotas autorizadas» |
| 3.3 | A | solicitudes de la tesorera → «Aprobar» → aprobar el desembolso en la Test Wallet **del fondo** | La 30 termina en «Listo»; el préstamo de B pasa a aprobado y desembolsado |
| 3.4 | B | Mi préstamo | Monto recibido en su moneda y fecha del desembolso; el saldo de B subió |
| 3.5 | A | Aprobar una solicitud **sin** cuotas autorizadas | Aviso de que falta el permiso (`409 RepaymentNotAuthorized`), sin desembolso |

## 4. Metas (solo en el celular)

| # | Quién | Pasos | Debe pasar |
|---|---|---|---|
| 4.1 | B | Natillera → Metas | Aviso «Por ahora, solo en este celular» |
| 4.2 | B | Nueva meta → Colecta → billetera real → aportar y aprobar | El aporte es un pago real (sale en el historial y baja el saldo); la meta muestra el avance |
| 4.3 | B | Cerrar la app y abrirla | La meta ya no está (esperado: `/goals` no existe en el back). En el pitch no decir que se guarda en la nube |

## Si algo falla

1. Anotar el número del paso, la hora y el texto de la app. Captura del registro técnico.
2. Avisar en el grupo a Ciro (back) con eso. Los arreglos del back van a `backend/` de este repo.
3. Si no se arregla antes de las 10:30: esa parte se muestra en **modo demo** en el pitch («Empezar con datos de
   ejemplo») y se dice tal cual. El pago real (sección 1) es lo único que no puede faltar.
