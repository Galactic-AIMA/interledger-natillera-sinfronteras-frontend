import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { ApiError } from './client';
import { config } from './config';
import { logEvent } from './devLog';
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
  // En el registro solo va el nombre de la operación y el flujo: nunca usuario, contraseña ni tokens.
  const label = typeof body.AuthFlow === 'string' ? `${target} · ${body.AuthFlow}` : target;
  const started = Date.now();
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
    logEvent({ kind: 'cognito', label, ok: false, ms: Date.now() - started, detail: 'sin conexión' });
    throw new ApiError('No hay conexión. Revise su internet e intente de nuevo.', 0, 'network');
  }
  const data = (await response.json().catch(() => ({}))) as T;
  const failure = data as { __type?: string; message?: string };
  logEvent({
    kind: 'cognito',
    label,
    ok: response.ok,
    status: response.status,
    ms: Date.now() - started,
    detail: response.ok ? undefined : [failure.__type?.split('#').pop(), failure.message].filter(Boolean).join(': ') || undefined,
  });
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

const WALLET_HOST = 'https://ilp.interledger-test.dev';

/**
 * Lleva la billetera a URL https, que es lo único que acepta el pre-signup del back.
 * Acepta la URL completa, el payment pointer `$ilp.interledger-test.dev/x` o solo el id `x`.
 */
export function normalizeWalletAddress(input: string): string {
  const raw = input.trim();
  if (raw.startsWith('$')) return `https://${raw.slice(1)}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${WALLET_HOST}/${raw.replace(/^\/+/, '')}`;
}

// Motivos que lanza el pre-signup del back (deploy/pre-signup/index.mjs de la rama `david`), en inglés.
const PRE_SIGNUP_REASONS: ReadonlyArray<readonly [string, string]> = [
  ['wallet address is required', 'Escriba la dirección de su billetera.'],
  ['invalid wallet address', 'No encontramos esa billetera. Revise la dirección.'],
  ['email already registered', 'Ese correo ya tiene una cuenta.'],
  ['phone number already registered', 'Ese teléfono ya tiene una cuenta.'],
  ['username already registered', 'Ese usuario ya existe. Elija otro.'],
] as const;

// Mensajes en "usted" para los errores de SignUp (llegan con status 400 en __type y message).
function signUpErrorMessage(type: string, message: string | undefined): string {
  if (type.endsWith('UserLambdaValidationException')) {
    // Cognito antepone texto técnico ("PreSignUp failed with error …"); se traduce el motivo del back.
    const text = (message ?? '').toLowerCase();
    const known = PRE_SIGNUP_REASONS.find(([reason]) => text.includes(reason));
    return known ? known[1] : 'No pudimos validar sus datos. Revise la billetera, el correo y el teléfono.';
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
      { Name: 'custom:walletId', Value: normalizeWalletAddress(input.walletAddress) },
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
  // Auditoría 2026-10-16: revocar el refresh token en Cognito; borrar solo lo local lo deja vivo.
  const tokens = await load();
  if (tokens?.refreshToken && config.cognitoClientId) {
    try {
      await fetch(`https://cognito-idp.${config.cognitoRegion}.amazonaws.com/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityProviderService.RevokeToken' },
        body: JSON.stringify({ Token: tokens.refreshToken, ClientId: config.cognitoClientId }),
      });
    } catch {
      // Sin conexión: igual se cierra la sesión en el teléfono.
    }
  }
  await save(null);
}

/** Datos del usuario en el IdToken de Cognito (sub, cognito:username, email, phone_number, custom:walletId). */
export async function getIdTokenClaims(): Promise<Record<string, string> | null> {
  if (!(await getAuthToken())) return null;
  const tokens = await load();
  const payload = tokens?.idToken.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    // atob devuelve bytes: se decodifican como UTF-8 para no dañar tildes ni eñes.
    const utf8 = decodeURIComponent(Array.from(binary, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
    return JSON.parse(utf8) as Record<string, string>;
  } catch {
    return null;
  }
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
