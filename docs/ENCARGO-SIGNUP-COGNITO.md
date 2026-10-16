# Encargo para Henry: registro directo a Cognito

> De Camilo (carril `base`) a Henry. Fecha: 2026-10-16. Rama sugerida: `feat/auth-signup` salida de `main`.
> **Autorización:** Camilo te autoriza a tocar `src/api/auth.ts`, `src/api/httpApi.ts` y `src/api/types.ts` solo para esto. No toques nada más de `src/api`.

## Por qué

El back confirmó que el registro **no pasa por nuestra API**: es un `SignUp` directo a Cognito, igual que el login. Hoy el front hace `POST /signup` a API Gateway ([httpApi.ts:60](../src/api/httpApi.ts)), ruta que no existe. Hay que cambiarlo.

## Datos del back (fuente: mensaje del back; detalle en `docs/API-AUTH.md` de la rama `david` del repo back, que no hemos leído)

- Endpoint: `https://cognito-idp.us-east-2.amazonaws.com/` (ya está en `config.cognitoRegion`).
- Headers: `Content-Type: application/x-amz-json-1.1` y `X-Amz-Target: AWSCognitoIdentityProviderService.SignUp`.
- Sin token ni API key. El App Client no tiene secreto, así que **no** hay `SecretHash`.
- Body:

```json
{
  "ClientId": "<config.cognitoClientId>",
  "Username": "usuario",
  "Password": "<contraseña>",
  "UserAttributes": [
    { "Name": "email", "Value": "correo@x.com" },
    { "Name": "phone_number", "Value": "+573001234567" },
    { "Name": "custom:walletId", "Value": "https://ilp.interledger-test.dev/xxxx" }
  ]
}
```

- Teléfono en formato internacional: `+57` y el número, sin espacios.
- Contraseña: mínimo 8, con mayúscula, minúscula, número y símbolo.
- `custom:walletId`: la URL de la Test Wallet del usuario (también sirve solo el id). La wallet debe existir: el back la verifica.
- Éxito: `{"UserConfirmed": true, "UserSub": "..."}`. **La cuenta queda confirmada al instante, sin código por correo.** No hace falta pantalla de confirmación: después del `SignUp` se llama a `signIn(username, password)`.

## Qué hacer

1. **`src/api/auth.ts`:** añadir `export async function signUp(input: SignupInput): Promise<void>`, con el mismo estilo de `initiateAuth` (fetch directo, sin Amplify). Mapear `walletAddress` → `custom:walletId` y `phone` → `phone_number`.
2. **`src/api/httpApi.ts`:** reemplazar `signup: (input) => request<void>('POST', '/signup', input, false)` por `signup: async (input) => { await signUp(input); await signIn(input.username, input.password); }`. Importar `signUp`.
3. **Errores** (llegan con status 400, en `__type` y `message`). Lanzar `ApiError` con estos mensajes, en "usted":

| `__type` | Mensaje al usuario |
|---|---|
| `UserLambdaValidationException` | Mostrar el `message` del back (wallet inválida, correo o teléfono ya registrados) |
| `UsernameExistsException` | Ese usuario ya existe. Elija otro. |
| `InvalidPasswordException` | La contraseña es débil. Use mínimo 8 caracteres con mayúscula, minúscula, número y símbolo. |
| `InvalidParameterException` | Revise el teléfono (+57…) y el correo. |
| otro | No pudimos crear la cuenta. Intente de nuevo. |

   Ojo: en `UserLambdaValidationException` Cognito suele anteponer texto técnico al `message` (algo como "PreSignUp failed with error …"). Pruébalo con una wallet falsa y, si viene feo, recorta lo que haya antes del último `:`.
4. **Pantalla** [crear-cuenta.tsx](../src/app/(auth)/crear-cuenta.tsx): validar el teléfono con `/^\+57\d{10}$/` antes de enviar. No cambies el resto del diseño.
5. **`mockApi`:** no se toca; el modo demo debe seguir funcionando.
6. **Docs:** corregir `docs/api-contrato.md`: el registro es Cognito directo, ya no `POST /signup`.

## Cómo probar

- Con `EXPO_PUBLIC_COGNITO_CLIENT_ID` en tu `.env` (no versionado), registrar un usuario de prueba en Expo Go y comprobar que entra a la app.
- Probar los 4 errores: usuario repetido, contraseña débil (`abc`), teléfono sin `+57`, wallet inexistente.
- `npx tsc --noEmit` limpio.
- Por terminal en Windows usar `curl.exe` (en PowerShell `curl` es otro comando), con el JSON en un archivo y `--data-binary @archivo.json`.

## Reglas que siguen vigentes

- Ningún secreto en el repo ni en el prompt. Contraseñas de prueba solo las que tú inventes; los prompts se publican.
- Una fila nueva en la tabla de [AI_USAGE.md](../AI_USAGE.md) al cerrar la tarea.
- Push y PR a `main` solo con OK de Camilo.

## Listo cuando

Un usuario se registra desde la app contra Cognito real, entra solo, y los errores se ven en español claro. Anótalo en la bitácora `base` de [MEMORY.md](../MEMORY.md).
