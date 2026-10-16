import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { config } from './config';
import { ApiError } from './client';

// Login con Cognito (flujo 2 del back) llamando InitiateAuth por fetch, sin Amplify.
// Requiere un App Client sin secreto y con USER_PASSWORD_AUTH habilitado.

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

async function initiateAuth(authFlow: 'USER_PASSWORD_AUTH' | 'REFRESH_TOKEN_AUTH', params: Record<string, string>) {
  if (!config.cognitoClientId) throw new ApiError('Falta configurar Cognito (EXPO_PUBLIC_COGNITO_CLIENT_ID).', 0, 'config');
  const response = await fetch(`https://cognito-idp.${config.cognitoRegion}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({ AuthFlow: authFlow, ClientId: config.cognitoClientId, AuthParameters: params }),
  });
  const data = (await response.json()) as CognitoAuthResult;
  if (!response.ok || !data.AuthenticationResult) {
    const notAuthorized = data.__type?.includes('NotAuthorized') || data.__type?.includes('UserNotFound');
    throw new ApiError(notAuthorized ? 'Usuario o contraseña incorrectos.' : 'No pudimos entrar. Intente de nuevo.', response.status, data.__type ?? 'auth');
  }
  return data.AuthenticationResult;
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
