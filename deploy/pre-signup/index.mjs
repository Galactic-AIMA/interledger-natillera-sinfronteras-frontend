// Lambda "pre-signup" (trigger Pre sign-up de Cognito) — versión para pegar en la consola.
// Basada en app/src/handlers/cognito-pre-signup.handler.ts de Duvan (rama duvdev), con arreglos:
//  - región tomada del entorno de Lambda (estamos en us-east-2), no fija en us-east-1
//  - la wallet se verifica con un GET público (no requiere llaves ni @interledger/open-payments,
//    que no viene incluido en el runtime de Lambda)
//  - si la wallet no existe se rechaza (antes se usaba && y pasaba igual)
//  - devuelve el event (Cognito lo exige) y auto-confirma al usuario (flujo 1 del diagrama)
//  - usa event.userPoolId en vez de la variable de entorno USER_POOL_ID
// Runtime: Node.js 22.x · archivo index.mjs · handler index.handler · timeout 5 s.
// Permiso extra del rol: cognito-idp:ListUsers sobre el user pool.
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const WALLET_HOST = 'https://ilp.interledger-test.dev';

export const handler = async (event) => {
  const attrs = event?.request?.userAttributes ?? {};
  const walletId = attrs['custom:walletId'];

  if (!walletId) throw new Error('Wallet address is required');

  const wallet = await getWalletAddress(walletId);
  if (!wallet) throw new Error('Invalid wallet address');

  if (attrs.email && (await existsUserWith(event.userPoolId, 'email', attrs.email))) {
    throw new Error('Email already registered');
  }
  if (attrs.phone_number && (await existsUserWith(event.userPoolId, 'phone_number', attrs.phone_number))) {
    throw new Error('Phone number already registered');
  }

  event.response.autoConfirmUser = true;
  if (attrs.email) event.response.autoVerifyEmail = true;
  if (attrs.phone_number) event.response.autoVerifyPhone = true;
  return event;
};

// Acepta la URL completa (https://ilp.interledger-test.dev/abc) o solo el id (abc).
const getWalletAddress = async (walletId) => {
  const url = walletId.startsWith('https://') ? walletId : `${WALLET_HOST}/${walletId}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.id && body?.assetCode ? body : null;
  } catch (error) {
    console.log('Wallet lookup failed', url, error?.message);
    return null;
  }
};

const existsUserWith = async (userPoolId, attribute, value) => {
  const response = await cognito.send(new ListUsersCommand({
    UserPoolId: userPoolId,
    Filter: `${attribute} = "${value.replace(/"/g, '')}"`,
    Limit: 1,
  }));
  return (response.Users?.length ?? 0) > 0;
};
