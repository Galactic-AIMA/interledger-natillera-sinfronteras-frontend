# Encargos enviados a otras sesiones de Claude Code · 2026-10-16

Los encargos (prompts) que la sesión de planeación redactó para las sesiones paralelas. A y B los pegó Camilo a mano en sesiones abiertas en los worktrees `frontend-cuenta` y `frontend-pagos`; C se lanzó desde la sesión de planeación. Texto literal.

## A-cuenta-natillera

Eres la sesión A del front de Natillera sin Fronteras (carril `cuenta-natillera`, rama `feat/cuenta-natillera`). Antes de nada lee CLAUDE.md, MEMORY.md, docs/EJECUCION-PANTALLAS.md (tu plan: "Sesión A · cuenta-natillera"), docs/figma-pantallas.md (+ docs/_figma_raw.txt para los textos exactos) y "Cómo usar la base" en docs/HENRY.md. Reclama el carril en la tabla de Carriles de MEMORY.md (ya estás en la rama `feat/cuenta-natillera`, carpeta frontend-cuenta).

Orden:
1. 10 Mi natillera (PULIDA, camino del pitch) en src/app/(tabs)/natillera/index.tsx: ilustración SVG "frasco + camino del año" (react-native-svg), Fondo, Su ahorro, Estado, botón "Poner la cuota" → /natillera/cuota, LinkRow ¿Quién pone? y Préstamos, "Lo último que pasó". La misma ruta muestra 05 o 06 según useMyNatillera().
2. 01 Bienvenida (pulir) y 03 Entrar (useApiContext().login; en demo: rosa.gomez, luz, andres con cualquier contraseña).
3. 05, 06, 02, 08, 09 (QR), 07.
4. 15, 04 (en demo: selector de usuario con demoUsers + cerrar sesión), 35 (respuestas fijas).
Si terminas, préstamos 16–25 en rama feat/creditos coordinando por MEMORY.md.

Reglas: /ui-ux-pro-max antes de maquetar; solo useApi() y hooks de @/api; todo funciona en modo demo; textos en "usted" del Figma; áreas táctiles ≥ 48 px y probar con A+ al máximo; animaciones sutiles con reanimated. Eres dueña de src/theme, src/components, src/api y src/app/_layout.tsx (atiende los "Pedidos entre carriles" de la sesión B). Tus componentes propios en src/features/natillera/.
npm install al empezar. Cada pantalla: npx tsc --noEmit + recorrido en web o Expo Go sin errores. Commits pequeños con Co-Authored-By. Al cerrar cada bloque: fila en AI_USAGE.md y línea en tu bitácora de MEMORY.md. NO merge a main ni push sin OK de Camilo; avísale cuando 10, 01 y 03 estén listas.

## B-pagos

Eres la sesión B del front de Natillera sin Fronteras (carril `pagos`, rama `feat/pagos`). Antes de nada lee CLAUDE.md, MEMORY.md, docs/EJECUCION-PANTALLAS.md (tu plan: "Sesión B · pagos"), docs/figma-pantallas.md (+ docs/_figma_raw.txt) y "Cómo usar la base" en docs/HENRY.md. Reclama el carril en MEMORY.md (ya estás en la rama `feat/pagos`, carpeta frontend-pagos).

Orden:
1. 11 Poner la cuota (PULIDA) en src/app/(tabs)/natillera/cuota.tsx: ¿A nombre de quién? (Choice con los socios), resumen con api.previewQuote (Llega a la natillera / Sale de su billetera / Costo del envío; si devuelve null, "se calcula al confirmar"), "Poner la cuota" → api.startPayment → /billetera/antes con params, fila "Que se cobre sola" → /natillera/recurrente.
2. 28 Antes de la billetera (PULIDA): 3 pasos, "Ir a la billetera" → openWallet(api, {...}) → /billetera/volviendo con params; "Ahora no".
   30 Volviendo: api.finishPayment + waitForFinalPayment → /resultado con tipo.
   resultado.tsx: 34 Cuota puesta (PULIDA), 31 Pago hecho, 32 Permiso rechazado, 33 Algo falló, y más tarde 14/19/23, con ResultScreen. Invalida keys.natillera y keys.payments.
3. 26 Pagar (cuentas guardadas, monto, resumen, "Sus pagos") y 27 Guardar cuenta.
4. 12 Pagos recurrentes y 14 Cuota automática activada (startRecurring → openWallet → finishRecurring) + botón demo "Cobrar ahora" (chargeRecurringNow).
5. Préstamos 16–25 si la sesión A no los tomó (ver MEMORY.md).

Reglas: /ui-ux-pro-max antes de maquetar; solo useApi() y hooks de @/api; todo funciona en modo demo (allí un diálogo hace de billetera); textos en "usted" del Figma; áreas táctiles ≥ 48 px; A+ al máximo; animaciones sutiles con reanimated. NO edites src/theme, src/components, src/api ni src/app/_layout.tsx: si necesitas algo, pídelo en "Pedidos entre carriles" de MEMORY.md. Tus componentes en src/features/pagos/.
npm install al empezar. Cada pantalla: npx tsc --noEmit + recorrido en web o Expo Go. Commits pequeños con Co-Authored-By. Al cerrar cada bloque: fila en AI_USAGE.md y línea en tu bitácora. NO merge a main ni push sin OK de Camilo; avísale cuando 11 → 28 → 30 → 34 funcione en demo.

## C-emulador-android

Tarea: dejar un emulador Android funcionando en este equipo Windows para probar la app Expo de Natillera sin Fronteras (carpeta D:\GalacticAIMA\NatilleraSinFronteras\frontend). No edites código del repo.

Estado actual: no hay Android SDK ni emulador; hay Java 21 (Microsoft OpenJDK). Pasos:
1. Pide OK a Camilo antes de instalar (~15 GB). Instala Android Studio (winget: Google.AndroidStudio) o solo las command-line tools si prefieres algo más liviano.
2. Instala platform-tools, emulator y una imagen de sistema reciente x86_64 con Google APIs; crea un AVD tipo Pixel.
3. Configura ANDROID_HOME (%LOCALAPPDATA%\Android\Sdk) y agrega platform-tools y emulator al PATH del usuario (explícale a Camilo qué cambias).
4. Arranca el emulador, instala Expo Go y verifica: en frontend corre `npx expo start` y presiona `a`; la app debe abrir en la bienvenida y entrar con "Empezar con datos de ejemplo".
5. Opcional si sobra tiempo: probar `npx expo run:android` para saber si podemos generar el APK local; si no, documentar EAS Build como alternativa.
Hecho = emulador arrancando, app corriendo en él, y los comandos exactos anotados en D:\GalacticAIMA\NatilleraSinFronteras\memory\ como memoria de proyecto.

## Prompt con el que se lanzó la sesión del emulador

Lee y ejecuta el encargo de D:\GalacticAIMA\NatilleraSinFronteras\sesiones\C-emulador-android.md. Resumen: instalar Android SDK/emulador en este Windows (pide OK a Camilo antes de instalar ~15 GB), crear un AVD Pixel, configurar ANDROID_HOME y PATH explicando los cambios, arrancar el emulador, instalar Expo Go y verificar que la app de D:\GalacticAIMA\NatilleraSinFronteras\frontend abre con `npx expo start` + `a` y entra con "Empezar con datos de ejemplo". No edites código del repo frontend. Hecho = emulador funcionando con la app y comandos exactos guardados como memoria en D:\GalacticAIMA\NatilleraSinFronteras\memory\ (un archivo con frontmatter, enlazado en el Índice de D:\GalacticAIMA\NatilleraSinFronteras\MEMORY.md).
