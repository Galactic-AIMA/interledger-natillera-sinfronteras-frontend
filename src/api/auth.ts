import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { config } from './config';
import { ApiError } from './client';
import type { SignupInput } from './types';

// Registro y login directos a Cognito (SignUp e InitiateAuth) por fetch, sin Amplify ni token ni API key.
// Requiere un App Client sin secreto (sin SecretHash) y con USER_PASSWORD_AUTH habilitado.
// Contrato: docs/API-AUTH.md de la rama `david` del back y docs/ENCARGO-SIGNUP-COGNITO.md.

type Tokens = { accessToken: string; idToken: string; refreshToken?: string; expiresAt: number };

const STORAGE_KEY = 'natillera.tokens';
let memoryTokens: Tokens | null = null;

// SecureStore no existe en web: allí los tokens viven solo en memoria.
async function save(tokens: Tokens | null) {
  memoryTokens = tokens;
  if (Platform.OS === 'web') return;
  if (tokens) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}

async function load(): Promise<Tokens | null> {
  if (memoryTokens || Platform.OS === 'web') return memoryTokens;
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  memoryTokens = raw ? (JSON.parse(raw) as Tokens) : null;
  return memoryTokens;
}

type CognitoAuthResult = {
  AuthenticationResult?: { AccessToken: string; IdToken: string; RefreshToken?: string; ExpiresIn: number };
  ChallengeName?: string;
  __type?: string;
  message?: string;
};

type CognitoTarget = 'SignUp' | 'InitiateAuth';

// Las dos operaciones son POST al mismo endpoint de Cognito; solo cambia X-Amz-Target.
async function cognito<T>(target: CognitoTarget, body: Record<string, unknown>): Promise<{ response: Response; data: T }> {
  let response: Response;
  try {
    response = await fetch(`https://cognito-idp.${config.cognitoRegion}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No hay conexión. Revise su internet e intente de nuevo.', 0, 'network');
  }
  const data = (await response.json().catch(() => ({}))) as T;
  return { response, data };
}

async function initiateAuth(authFlow: 'USER_PASSWORD_AUTH' | 'REFRESH_TOKEN_AUTH', params: Record<string, string>) {
  if (!config.cognitoClientId) throw new ApiError('Falta configurar Cognito (EXPO_PUBLIC_COGNITO_CLIENT_ID).', 0, 'config');
  const { response, data } = await cognito<CognitoAuthResult>('InitiateAuth', { ClientId: config.cognitoClientId, AuthFlow: authFlow, AuthParameters: params });
  if (!response.ok || !data.AuthenticationResult) {
    const notAuthorized = data.__type?.includes('NotAuthorized') || data.__type?.includes('UserNotFound');
    throw new ApiError(notAuthorized ? 'Usuario o contraseña incorrectos.' : 'No pudimos entrar. Intente de nuevo.', response.status, data.__type ?? 'auth');
  }
  return data.AuthenticationResult;
}

type CognitoSignUpResult = { UserConfirmed?: boolean; UserSub?: string; __type?: string; message?: string };

// Mensajes en "usted" para los errores de SignUp (llegan con status 400 en __type y message).
function signUpErrorMessage(type: string, message: string | undefined): string {
  if (type.endsWith('UserLambdaValidationException')) {
    // Cognito antepone texto técnico ("PreSignUp failed with error …:"); se muestra solo el motivo del back.
    const reason = (message ?? '').split(':').pop()?.trim();
    return reason || 'No pudimos validar sus datos. Revise la billetera, el correo y el teléfono.';
  }
  if (type.endsWith('UsernameExistsException')) return 'Ese usuario ya existe. Elija otro.';
  if (type.endsWith('InvalidPasswordException')) return 'La contraseña es débil. Use mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.';
  if (type.endsWith('InvalidParameterException')) return 'Revise el teléfono (+57…) y el correo.';
  return 'No pudimos crear la cuenta. Intente de nuevo.';
}

/** Registro directo a Cognito. La cuenta queda confirmada al instante (sin código por correo). */
export async function signUp(input: SignupInput): Promise<void> {
  if (!config.cognitoClientId) throw new ApiError('Falta configurar Cognito (EXPO_PUBLIC_COGNITO_CLIENT_ID).', 0, 'config');
  const { response, data } = await cognito<CognitoSignUpResult>('SignUp', {
    ClientId: config.cognitoClientId,
    Username: input.username.trim(),
    Password: input.password,
    UserAttributes: [
      { Name: 'email', Value: input.email.trim() },
      { Name: 'phone_number', Value: input.phone.replace(/\s/g, '') },
      { Name: 'custom:walletId', Value: input.walletAddress.trim() },
    ],
  });
  if (!response.ok || !data.UserSub) {
    const type = data.__type ?? 'signup';
    throw new ApiError(signUpErrorMessage(type, data.message), response.status, type);
  }
}

export async function signIn(username: string, password: string): Promise<void> {
  const result = await initiateAuth('USER_PASSWORD_AUTH', { USERNAME: username.trim(), PASSWORD: password });
  await save({ accessToken: result.AccessToken, idToken: result.IdToken, refreshToken: result.RefreshToken, expiresAt: Date.now() + result.ExpiresIn * 1000 });
}

export async function signOut(): Promise<void> {
  await save(null);
}

/** Token para el header Authorization; lo renueva si vence en menos de un minuto. */
export async function getAuthToken(): Promise<string | null> {
  let tokens = await load();
  if (!tokens) return null;
  // Vencido y sin refresh: no se manda un token muerto (evita 401 en bucle).
  if (tokens.expiresAt <= Date.now() && !tokens.refreshToken) {
    await save(null);
    return null;
  }
  if (tokens.expiresAt - Date.now() < 60_000 && tokens.refreshToken) {
    try {
      const result = await initiateAuth('REFRESH_TOKEN_AUTH', { REFRESH_TOKEN: tokens.refreshToken });
      tokens = { ...tokens, accessToken: result.AccessToken, idToken: result.IdToken, expiresAt: Date.now() + result.ExpiresIn * 1000 };
      await save(tokens);
    } catch {
      await save(null);
      return null;
    }
  }
  // El diagrama del back dice accessToken; si su authorizer espera el idToken, se cambia en config.
  return config.authTokenType === 'id' ? tokens.idToken : tokens.accessToken;
}
