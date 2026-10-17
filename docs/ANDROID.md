# Android: emulador, celular y APK

Cómo corrimos la app de Expo en Android durante la hackatón (16–17 oct 2026), qué funcionó y qué nos hizo perder tiempo. Todo lo de aquí se probó en Windows 11 con Expo SDK 58; los números de versión cambian, el procedimiento no.

## Resumen: qué usar para qué

| Necesito | Camino | Tiempo real |
|---|---|---|
| Iterar pantallas rápido | `npx expo start` + tecla `w` (navegador) o el emulador | Segundos (recarga en caliente) |
| Ver la app en un Android sin celular | Emulador de Android Studio + Expo Go | ~1 h la primera vez (instalación), luego 1 min |
| Mostrarla en un celular físico | **Cable USB** + `adb reverse` + Expo Go | 2 min |
| Entregar algo instalable | APK con EAS Build (perfil `preview`) | ~15–20 min en la nube |

**Lección principal:** para un celular físico, ir directo al cable. Perdimos más de una hora con la Wi-Fi del evento y con Expo Go de la Play Store.

## 1. Instalar Android Studio y el emulador

No hace falta abrir Android Studio ni su asistente: basta el SDK y sus herramientas de línea de comandos.

| Pieza | Lo que instalamos |
|---|---|
| Android Studio | `winget install Google.AndroidStudio` |
| SDK | `%LOCALAPPDATA%\Android\Sdk`: `cmdline-tools;latest`, `platform-tools`, `emulator`, `platforms;android-36`, `build-tools;36.0.0` |
| Imagen del sistema | `system-images;android-36;google_apis;x86_64` |
| AVD | Perfil `pixel_8`, 4 GB de RAM, GPU automática, teclado físico activado |
| Aceleración | WHPX (Hyper-V de Windows); se revisa con `emulator -accel-check` |

Variables de entorno del usuario (abrir una terminal nueva después de ponerlas):

| Variable | Valor |
|---|---|
| `ANDROID_HOME` | `%LOCALAPPDATA%\Android\Sdk` |
| `PATH` (agregar) | `%ANDROID_HOME%\platform-tools`, `%ANDROID_HOME%\emulator`, `%ANDROID_HOME%\cmdline-tools\latest\bin` |

Crear el AVD por línea de comandos:

```bash
sdkmanager "platform-tools" "emulator" "platforms;android-36" "build-tools;36.0.0" "system-images;android-36;google_apis;x86_64"
avdmanager create avd -n Natillera_Pixel_8 -k "system-images;android-36;google_apis;x86_64" -d pixel_8
```

Respalda tu `PATH` antes de tocarlo.

## 2. Correr la app en el emulador

```bash
emulator -avd Natillera_Pixel_8 -no-boot-anim
adb devices
npx expo start --android --port 8083
```

`--android` hace lo mismo que `npx expo start` + tecla `a`: instala Expo Go en el emulador si falta y abre la app.

Si el Metro ya está prendido, o el emulador se reinició, se conecta a mano:

```bash
adb reverse tcp:8083 tcp:8083
adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8083" host.exp.exponent
```

## 3. Correr la app en un celular físico (por cable)

1. En el celular: Opciones de desarrollador → Depuración USB activada. Conectar y aceptar la huella del equipo.
2. Instalar el Expo Go que coincide con el SDK del proyecto (el que Expo ya bajó al emulador):

   ```bash
   adb install --no-streaming -r %USERPROFILE%\.expo\android-apk-cache\Expo-Go-58.0.4.apk
   ```

3. Con `npx expo start --port 8083` corriendo:

   ```bash
   adb reverse tcp:8083 tcp:8083
   adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8083" host.exp.exponent
   ```

Lo que no funcionó, para no repetirlo:

| Intento | Por qué falló |
|---|---|
| QR por la Wi-Fi del evento | El computador y el celular quedaron en redes distintas (`ERR_ADDRESS_UNREACHABLE`) |
| Expo Go de la Play Store | Decía «incompatible» con el SDK del proyecto, aunque el APK del caché era válido |
| `npx expo start --tunnel` | Pide iniciar sesión en Expo y no se completó a tiempo |
| `adb install` normal en Xiaomi | Falla sin mensaje; con `--no-streaming` sí instala |

## 4. APK para instalar

El perfil `preview` de [`eas.json`](../eas.json) genera un APK de distribución interna y ya trae las variables públicas del API (URL, App Client de Cognito, métodos reales).

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Al terminar, EAS da un enlace y un QR para bajar el APK. Para instalarlo por cable: `adb install --no-streaming -r <archivo>.apk`.

- **Paquete Android:** `com.galacticaima.natillera` (en `app.json`); el esquema `natillera://` es el que usa la vuelta de la billetera.
- **Variables:** las de `EXPO_PUBLIC_*` se hornean en el APK al compilar. Solo valores públicos: nunca llaves.
- **Build local:** así salió la APK `v1.0.0` (2026-10-17), porque EAS no tenía sesión en el equipo. Se hace en un worktree aparte para no meter `android/` al repo:

```bash
git worktree add D:/na v1.0.0 && cd D:/na && npm ci
# exportar las EXPO_PUBLIC_* del perfil preview de eas.json
npx expo prebuild -p android --no-install --clean
# en android/app/build.gradle, dentro de android { }:
#   externalNativeBuild { cmake { buildStagingDirectory = file("D:/c") } }
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64
# sale en android/app/build/outputs/apk/release/app-release.apk
```

- **Trampa de Windows:** el `ninja` de CMake 3.22.1 falla con rutas de más de 260 caracteres (`mkdir(...): No such file or directory`). Por eso el worktree va en una ruta corta (`D:
a`) y la carpeta de CMake en `D:\c`. `subst` no sirve: el autolinking de Expo no encuentra `package.json` en la raíz de una unidad.
- **Arquitecturas:** sin `x86_64` la APK no abre en el emulador (`couldn't find DSO libreactnative.so`); con las tres pesa 86 MB.
- **Distribución:** la APK va adjunta a la Release `v1.0.0`; el QR de [`docs/qr/qr-apk.png`](qr/qr-apk.png) apunta a su descarga directa.

## 5. Trampas que nos costaron tiempo

| Síntoma | Causa y arreglo |
|---|---|
| Expo Go muestra la versión vieja después de un cambio grande | Conserva el bundle: `adb shell am force-stop host.exp.exponent` y abrir de nuevo |
| Expo Go lista varios servidores | Sale uno por cada Metro prendido (también los `--web`). Dejar uno solo y apagar los demás |
| `exp://localhost:8083` no abre | Se perdió el `adb reverse` al reiniciar el emulador o desconectar el cable: repetirlo |
| `tsc` falla con rutas «no asignables» | Otro Metro reescribió `.expo/types/router.d.ts` con rutas viejas: borrarlo y arrancar el Metro de nuevo |
| `npx expo lint` cambia `package.json` | Sin ESLint instalado lo instala solo: revertir si no era la intención |
| La Test Wallet dice «Internal Server Error» al aceptar | Era un segundo toque en Accept: Chrome bloqueaba la vuelta automática a la app y la pestaña seguía mostrando Accept. Con `return-payment` nuevo (página «Volver a la app» en vez del 302) ya no pasa. Si sale, el pago igual entró: cerrar la pestaña y la app muestra el resultado. Tocar Accept **una sola vez** |
| `adb shell input keyevent 4` cierra la pantalla | En el emulador «atrás» cierra la vista en vez del teclado |
| El texto escrito con `adb shell input text` sale distinto | El teclado de Android pega sugerencias: revisar el campo antes de enviar |
| El emulador no arranca o va muy lento | `emulator -accel-check`; activar la virtualización y WHPX |
