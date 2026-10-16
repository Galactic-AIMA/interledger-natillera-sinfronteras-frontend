# Prompts de Henry · Claude Code (escritorio) · rama feat/cuenta-celular

<!-- Guardados a mano: la sesión arrancó fuera del repo y el hook log-prompt.mjs no se activó para estos dos prompts. Literales. -->

## 15:20
Eres mi sesión de Claude Code para el front de Natillera sin Fronteras (Hackatón Open Payments de Interledger, Ruta N, Medellín). Soy Henry. Entrega: sábado 17/10 a las 11:00 (después no se toca código); pitch a las 12:00. Trabaja en español, directo y con pasos concretos. Si necesitas preguntarme algo, pregúntame.

0 · Arranque (haz esto primero, en orden)
Ubícate en el clon que ya existe en mi Escritorio: C:\Users\tabor\Desktop\natillera-front.
git config user.name "Henry" (el hook de prompts nombra los archivos con ese valor; no lo desactives).
Remotos: origin = repo del equipo Galactic-AIMA/interledger-natillera-sinfronteras-frontend; henry = mi fork HenryStark866/interledger-natillera-sinfronteras-frontend. Si falta henry, agrégalo.
Camilo me invitó como colaborador del repo del equipo (correo de GitHub del 16/10, 13:02). Pídeme que acepte la invitación (https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/invitations) antes de intentar cualquier push a origin. Tú no la aceptas.
git fetch --all, luego git switch -c feat/cuenta-celular henry/feat/cuenta-celular (o git switch feat/cuenta-celular si ya existe) y npm install.
Lee completos CLAUDE.md, MEMORY.md y docs/INTEGRACION-EXPO-GO.md. Ahí está todo el contexto; esto es un resumen.
1 · Estado (16/10 ~15:05)
Rama	Dónde	Qué tiene
main	equipo	Base + cuenta-natillera (01–10, 15, 35), último commit de Camilo 32eb791 (encargo de Cognito)
feat/cuenta-celular	mi fork	La rama a integrar. = main + pagos (11–14, 26–34) + auditoría de seguridad de la pasarela + préstamos (16–25) + registro Cognito + pulido en celular + docs. Último commit 85cb844. Contiene main completo: el PR entra sin conflictos
feat/creditos	mi fork	Lo mismo sin el pulido (4ad80af)
feat/auth-signup	mi fork	Solo Cognito sobre main (ac4ef52), por si Camilo lo quiere aparte

Verificado en esa rama: npx tsc --noEmit limpio, node scripts/ai-usage-check.mjs OK, recorridos automáticos en web en modo demo sin errores de consola: 01→10→11→28→34 (pitch), 16→17→19→20→21→23→24 (préstamos), 26→28→31 (pagar), 12→14 (cuota automática), validaciones de la 02 y botones «Volver». No probado contra servicios reales (Cognito, Test Wallet, back): la nube no tenía salida a AWS ni a interledger-test.dev.

Lo que ya se hizo y no hay que repetir:

Auth Cognito alineado al pie de la letra con el mensaje del back: POST https://cognito-idp.us-east-2.amazonaws.com/, X-Amz-Target SignUp / InitiateAuth, ClientId 20b10a2tnnr69lqlp2sf62orv0 (público, sin secreto), atributos email, phone_number (+57 sin espacios), custom:walletId; AccessToken en Bearer, refresh con REFRESH_TOKEN_AUTH, tokens en expo-secure-store; errores UserLambdaValidationException (motivo del back sin prefijo técnico), UsernameExistsException, InvalidPasswordException, InvalidParameterException, NotAuthorizedException en «usted». Código en src/api/auth.ts y httpApi.ts.
verifyWallet sin sesión consulta la dirección de pago pública de Open Payments (GET con Accept: application/json); con sesión usa el back. Sin esto la pantalla 02 no podía registrar a nadie en modo real.
.env.example ya trae us-east-2 y el ClientId.
Pulido: expo-clipboard ~58.0.3 («Copiar el enlace» real en la 09), src/features/navegacion/BackButton.tsx en las 13 pantallas apiladas, los cinco cambios de texto de más impacto de docs/copy-henry.md, aviso «Está tardando…» en la 30, botón «Volver a Préstamos» en la 21.
AI_USAGE.md, MEMORY.md, prompts/2026-10-16-henry-claude-ai.md y los docs al día.
Borradores del pitch: docs/pitch/GUION.md, docs/pitch/CONTEXTO.md, docs/pitch/borrador-slides.pptx (7 slides, guion en notas).
2 · Tareas, en este orden
T1 · Subir al repo del equipo (en cuanto yo acepte la invitación)
git push origin feat/cuenta-celular (y si Camilo lo pide, feat/creditos y feat/auth-signup).
La regla del equipo: el PR a main lo abre Camilo, y push/merge a main solo con su OK. Redáctame el mensaje para Camilo con el link del PR (https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend/compare/main...feat/cuenta-celular); yo lo envío.
T2 · Probar en Expo Go contra los servicios reales (prioridad oficial: pago de punta a punta)
copy .env.example .env y pídeme EXPO_PUBLIC_API_URL (URL de API Gateway del back; vacía = modo demo). Nunca la pegues en un prompt si trae algo secreto (no debería).
npx expo start y me guías para escanear el QR. En Expo Go la billetera vuelve a exp://<IP>:8081/--/retorno (la app lo arma con Linking.createURL('retorno')); confirma con el back que acepten ese returnUrl.
Sigue la lista de 8 pruebas de docs/INTEGRACION-EXPO-GO.md: verificación de billetera en la 02, registro real (+57 y 10 dígitos, contraseña tipo Clave#2026), los 4 errores de registro, login con clave mala, cuota 11→28→Test Wallet→30→34, préstamo con dos usuarios.
Lo que falle: arréglalo si es del front (TypeScript estricto, tsc limpio), o anótalo como pedido al back en MEMORY.md.
Para probar Cognito por terminal en Windows usa curl.exe con el JSON en un archivo (--data-binary @archivo.json). Usuarios y contraseñas de prueba: inventados, nunca reales, y nunca en un prompt.
T3 · Test Wallet (yo hago los pasos con la cuenta; tú me guías y registras)
Yo ya tengo cuenta en https://wallet.interledger-test.dev. Guíame para tener 3 direcciones (Doña Rosa, Luz y el fondo), idealmente en monedas distintas. Tú no creas cuentas ni escribes contraseñas.
Anota en la bitácora pagos de MEMORY.md: monedas disponibles (¿hay COP?), las direcciones https://ilp.interledger-test.dev/... (son públicas) y si la billetera acepta natillera://retorno / exp://… como finish URI. Prepárame el aviso para Duvan.
T4 · Slides en la plantilla oficial
El link de la plantilla oficial de Google Slides no está en el repo: pídemelo (está en el Slack #co-hackathon-2026 o el material del evento).
Pasa el contenido de docs/pitch/borrador-slides.pptx / docs/pitch/GUION.md a la plantilla (7 bloques: Doña Rosa, problema con datos, solución, demo, inclusión, qué sigue + equipo, cierre). Marca los [CONFIRMAR] que sigan abiertos.
T5 · Cierre de entrega (sábado)
Checklist de MEMORY.md: curso de Platzi / Guide to Open Payments de los 4, declarar si los bocetos de Figma usaron IA, pago real grabado, APK en Android real, video de respaldo antes de las 08:00, todo en main, repos públicos, slides + link de demo en el Drive, formulario.
node scripts/ai-usage-check.mjs limpio y "What We Did Ourselves" completo.
3 · Pendientes de otros (no los hagas tú; recuérdamelos)
Camilo (base): src/api/config.ts tiene cognitoRegion por defecto us-east-1 → debe ser us-east-2; decidir app.json web.output "server"→"single"; pendientes de docs/auditoria-2026-10-16.md (RevokeToken al salir, .gitignore con .env*, patrones extra en el hook).
Back: aceptar natillera://retorno y exp://…/--/retorno como returnUrl (lista exacta), GET /payments/{id}, charge-now, ignorar el result del cliente, validar dueño del paymentId, URL de API Gateway.
4 · Reglas no negociables
La app nunca firma con Open Payments ni guarda llaves. Montos { value: string, assetCode, assetScale }, nunca floats. Toda pantalla funciona en modo demo y real; nada de fetch en pantallas (solo en src/api).
src/theme, src/components, src/api, src/app/_layout.tsx son de Camilo: cambios solo autorizados (Cognito lo autorizó en auth.ts, httpApi.ts, types.ts); lo demás va a «Pedidos entre carriles» de MEMORY.md.
Ningún secreto en el repo, en .env versionado ni en un prompt (los prompts se publican). Nada de private.key.
Uso de IA (lo revisa el jurado): al cerrar cada tarea, fila en «Where and How We Used AI» de AI_USAGE.md (fecha, Henry, herramienta, qué, archivos) y línea en la bitácora de MEMORY.md. Commits en español con Co-Authored-By: Claude …. El hook guarda mis prompts solo en prompts/AAAA-MM-DD-henry-<rama>.md.
Código en inglés; comentarios, commits y docs en español. TypeScript estricto, sin any, as const en vez de enum. Áreas táctiles ≥ 48 px, tono «usted», probar con A+ al máximo.
Antes de cada push: npx tsc --noEmit y node scripts/ai-usage-check.mjs.

Empieza por el paso 0 y dime qué encontraste en el clon (rama actual, remotos, si feat/cuenta-celular está en 85cb844) antes de seguir con T1.

Proyecto en Claude ("HACKATON OPEN PAYEMENT INTERLEDGER"), con el prompt, la guía de integración y el plan de sesiones: https://claude.ai/project/01a14579-f8ca-7352-9a12-4ba82cd60880

* Repo en GitHub:
   * Tu fork, con la rama a integrar: https://github.com/HenryStark866/interledger-natillera-sinfronteras-frontend/tree/feat/cuenta-celular
   * Repo del equipo: https://github.com/Galactic-AIMA/interledger-natillera-sinfronteras-frontend
* En tu computador:
   * El repo clonado: `C:\Users\tabor\Desktop\natillera-front`
   * Los scripts, el bundle y el prompt: `C:\Users\tabor\Desktop\natillera-push`

## 15:30
Sí, fusiona henry/feat/creditos en feat/cuenta-celular, resuelve los 2 choques concatenando, verifica tsc, npm test y ai-usage-check, y haz commit (sin push todavía).
