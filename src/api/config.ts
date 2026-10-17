// Configuración por variables EXPO_PUBLIC_* (ver .env.example). Nada de esto es secreto:
// el App Client de Cognito sin secreto y la URL de la API son públicos por diseño.
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  cognitoRegion: process.env.EXPO_PUBLIC_COGNITO_REGION ?? 'us-east-2',
  cognitoClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
  // Ruta de "iniciar pago". El back la desplegó primero como /start-payment; el contrato dice /payments.
  paymentsStartPath: process.env.EXPO_PUBLIC_PAYMENTS_START_PATH || '/payments',
  authTokenType: process.env.EXPO_PUBLIC_AUTH_TOKEN_TYPE === 'id' ? ('id' as const) : ('access' as const),
  // Arranca en modo demo si se pide o si no hay Cognito. Con Cognito arranca en modo híbrido (ver hybridApi.ts).
  startInDemo: process.env.EXPO_PUBLIC_USE_MOCKS === '1' || !process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID,
} as const;
