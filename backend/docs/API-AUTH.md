# Auth: crear cuenta e iniciar sesión (flujos 1 y 2)

La app habla **directo con Cognito** para signup y login (son llamadas públicas: no llevan token
ni firma de AWS). El resto de endpoints irá por API Gateway con el `AccessToken` que devuelve el login.

| Dato | Valor |
|---|---|
| Endpoint | `https://cognito-idp.us-east-2.amazonaws.com/` |
| Método | `POST` |
| `Content-Type` | `application/x-amz-json-1.1` |
| `X-Amz-Target` | `AWSCognitoIdentityProviderService.SignUp` o `...InitiateAuth` |
| `ClientId` | `20b10a2tnnr69lqlp2sf62orv0` (app client del pool `us-east-2_2pQzW95IK`) |

## 1 · Crear cuenta (SignUp)

El campo `walletAddress` del diagrama va en el atributo **`custom:walletId`** (URL completa
`https://ilp.interledger-test.dev/xxxx` o solo el id `xxxx`). El trigger `pre-signup` verifica que
la wallet exista, rechaza email/teléfono repetidos y auto-confirma la cuenta.

```http
POST https://cognito-idp.us-east-2.amazonaws.com/
Content-Type: application/x-amz-json-1.1
X-Amz-Target: AWSCognitoIdentityProviderService.SignUp

{
  "ClientId": "20b10a2tnnr69lqlp2sf62orv0",
  "Username": "customUniqueName",
  "Password": "Natillera#2026",
  "UserAttributes": [
    { "Name": "email", "Value": "test@test.com" },
    { "Name": "phone_number", "Value": "+573125285133" },
    { "Name": "custom:walletId", "Value": "https://ilp.interledger-test.dev/f9a1abde" }
  ]
}
```

Respuesta OK (200):

```json
{ "UserConfirmed": true, "UserSub": "8a1b...-uuid", "CodeDeliveryDetails": null }
```

`UserSub` es el `userId` del diagrama (claim `sub` del token).

Errores (400, campo `__type` + `message`):

| `__type` | Cuándo |
|---|---|
| `UserLambdaValidationException` | `PreSignUp failed with error Invalid wallet address.` / `Email already registered.` / `Phone number already registered.` / `Wallet address is required.` |
| `UsernameExistsException` | El username ya existe |
| `InvalidPasswordException` | Contraseña débil (mín. 8, mayúscula, minúscula, número y símbolo) |
| `InvalidParameterException` | Formato inválido (teléfono debe ir en E.164: `+57...`) |

## 2 · Iniciar sesión (InitiateAuth)

```http
POST https://cognito-idp.us-east-2.amazonaws.com/
Content-Type: application/x-amz-json-1.1
X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth

{
  "ClientId": "20b10a2tnnr69lqlp2sf62orv0",
  "AuthFlow": "USER_PASSWORD_AUTH",
  "AuthParameters": { "USERNAME": "customUniqueName", "PASSWORD": "Natillera#2026" }
}
```

Respuesta OK (200):

```json
{
  "AuthenticationResult": {
    "AccessToken": "eyJ...",
    "IdToken": "eyJ...",
    "RefreshToken": "eyJ...",
    "ExpiresIn": 3600,
    "TokenType": "Bearer"
  },
  "ChallengeParameters": {}
}
```

- **Al backend va el `IdToken`** (`Authorization: Bearer <IdToken>`): el API es REST con autorizador
  Cognito, que valida el id token. URL base: `https://lofoyfhz52.execute-api.us-east-2.amazonaws.com/dev`.
- Guardar `RefreshToken` de forma segura (p. ej. `expo-secure-store`), no en AsyncStorage.
- Error típico: `NotAuthorizedException` → usuario o contraseña incorrectos.

### Renovar el token (cuando vence, 1 h)

```json
{
  "ClientId": "20b10a2tnnr69lqlp2sf62orv0",
  "AuthFlow": "REFRESH_TOKEN_AUTH",
  "AuthParameters": { "REFRESH_TOKEN": "<RefreshToken>" }
}
```

(mismo endpoint y `X-Amz-Target: ...InitiateAuth`; devuelve `AccessToken` e `IdToken` nuevos).

## Ejemplo en React Native (fetch)

```ts
const COGNITO_URL = 'https://cognito-idp.us-east-2.amazonaws.com/';
const CLIENT_ID = '20b10a2tnnr69lqlp2sf62orv0';

async function cognito<T>(action: 'SignUp' | 'InitiateAuth', body: object): Promise<T> {
  const res = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify({ ClientId: CLIENT_ID, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? data.__type);
  return data;
}

export const signUp = (u: { username: string; password: string; email: string; phone: string; walletAddress: string }) =>
  cognito<{ UserConfirmed: boolean; UserSub: string }>('SignUp', {
    Username: u.username,
    Password: u.password,
    UserAttributes: [
      { Name: 'email', Value: u.email },
      { Name: 'phone_number', Value: u.phone },
      { Name: 'custom:walletId', Value: u.walletAddress },
    ],
  });

export const login = (username: string, password: string) =>
  cognito<{ AuthenticationResult: { AccessToken: string; IdToken: string; RefreshToken: string; ExpiresIn: number } }>(
    'InitiateAuth',
    { AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: { USERNAME: username, PASSWORD: password } },
  );
```

## curl (para probar desde terminal)

```bash
curl -s https://cognito-idp.us-east-2.amazonaws.com/ -H 'Content-Type: application/x-amz-json-1.1' -H 'X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth' -d '{"ClientId":"20b10a2tnnr69lqlp2sf62orv0","AuthFlow":"USER_PASSWORD_AUTH","AuthParameters":{"USERNAME":"customUniqueName","PASSWORD":"Natillera#2026"}}'
```

Pendiente: guardar el usuario en `Users-info` (flujo 1, `assetCode`/`assetScale` leídos de la
wallet). Se puede hacer con un trigger **Post confirmation** o desde el primer endpoint del backend.
