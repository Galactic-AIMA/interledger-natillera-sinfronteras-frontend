# Prompts de henry · 2026-10-17 · sesión del logo y los préstamos (b3a5a546)

Registro literal y automático (hook de Claude Code). El hook los guardó en el archivo de la rama de la
carpeta principal (`feat/natillera-real`); aquí van solo los de esta sesión, que trabajó en los worktrees
`feat/cuenta-celular` (logo y slogan) y `feat/prestamos-reales`. Herramienta: Claude Code.

## 01:16 · sesión b3a5a546

Camilo está diciendo que saquemos otras cuatro opciones totalmente diferentes de logo, pero que enfoquen al propósito de, de, de la aplicación en un artefacto. Lucete, sé creativo.

## 01:21 · sesión b3a5a546

b

## 01:40 · sesión b3a5a546

Sí, a push eh, definimos el logo el que tiene los tres colores ahí te dejo el pantallazo de cuál fue el que definimos y y bueno nos gustó el eslogan eh, hace el push y déjale un comentario a Camilo para que entonces lo integre el logo en la aplicación creativamente y con animación. Bien elegante. Bien eso.

## 01:48 · sesión b3a5a546

este es el definitivo

## 02:00 · sesión b3a5a546



<pasted_content id="baf7">
📋 Instrucciones para el grupo (para pegar)

Backend — cómo trabajamos desde ya. Guía completa: docs/COORDINACION.md en david.

Estado: registro, login, pago 1 a 1 (2 pagos reales EUR→COP), cuentas guardadas, natilleras, invitaciones y préstamos fase 1 → ✅ en dev. PR duvanjaramillomarin/interterledger-natillera-sin-fronteras-backend#7 · start-payment funcionando, tabla… david → main abierto.

Reglas de oro

Nada se cambia en AWS por consola si hay script: rama → PR a david → se despliega con infra/. La consola es solo para mirar (logs, configuración).
Avisen en el grupo ANTES de desplegar o de tocar el rol, las tablas o el stage: «voy a desplegar X, ~N min». Al terminar: «listo, respaldo versión N».
Nunca borrar ni recrear tablas, ni quitar políticas del rol. Si falta un permiso, se agrega una inline nueva con su propio nombre.
Antes de reemplazar una Lambda, se publica una versión de respaldo (los scripts lo hacen). Revisen dos veces el nombre de la Lambda.
Cero llaves, tokens o contraseñas en código, logs, DynamoDB o el chat. La única llave vive en Secrets Manager: natillera/open-payments-client.
Un despliegue a la vez en dev. Después de desplegar, el stage tarda ~1 min en responder (antes da 403).
Los zips de dist/ siempre chocan en un merge: resuelvan y vuelvan a compilar.

Quién es dueño de qué

David: Lambdas de pagos, pre-signup, permisos del rol y POST /payments/preview (cubre lo de Duvan mientras no está).
Camilo: Lambdas del bloque A (natilleras, cuentas, perfil); las despliega él con infra/deploy-natilleras.sh.
Henry: escribe préstamos y David los despliega. También front, docs, openapi.yaml, AI_USAGE y video.
Duvan (cuando vuelva): leer docs/REPORTE-DUVAN.md §9. Su start-payment está desplegado con 6 [fix]; si lo cambia, por PR sobre deploy/payments/src/start-payment-duvan.ts.

Tareas ahora

Camilo:
Trae david a feat/natilleras-multi. En el conflicto de infra/deploy-natilleras.sh, conserva los bloques Logs y Secrets.
Corre los tests, abre el PR a david y, cuando David lo revise, despliégalo tú avisando antes.
Prueba real de aporte: prueba3 se une a “Familia Ciro” (FAMILIA-Z9BR-J4TX), aporta en COP y aprueba con la cuenta dueña de su wallet; luego revisa que suba fundTotal y pide un préstamo.
Henry:
Conectar como reales simulateLoan, requestLoan, getMyLoans, listPendingLoanRequests y previewQuote (POST /payments/preview, apenas David confirme).
openapi.yaml y README (monto en la moneda de quien recibe).
AI_USAGE y prompts de todos. El video al final.
Recurrente y préstamos fase 2: se quedan en modo demo para el pitch.

No hacer: correr infra/deploy-payments.sh sin avisar a David · revivir el PR #6 · borrar tablas o quitar permisos · guardar llaves en DynamoDB o imprimirlas en logs · desplegar al mismo tiempo que otra persona.

Si la Test Wallet dice “Internal Server Error” al aceptar, no es fallo: revisen el pago con GET /payments/{id}.
</pasted_content id="baf7">

## 02:02 · sesión b3a5a546

haz lo nuestro
