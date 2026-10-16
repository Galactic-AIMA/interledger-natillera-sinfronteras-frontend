// Configuración por variables EXPO_PUBLIC_* (ver .env.example). Nada de esto es secreto:
// el App Client de Cognito sin secreto y la URL de la API son públicos por diseño.
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  cognitoRegion: process.env.EXPO_PUBLIC_COGNITO_REGION ?? 'us-east-1',
  cognitoClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
  authTokenType: process.env.EXPO_PUBLIC_AUTH_TOKEN_TYPE === 'id' ? ('id' as const) : ('access' as const),
  // Arranca en modo demo si se pide o si todavía no hay URL del back.
  startInDemo: process.env.EXPO_PUBLIC_USE_MOCKS === '1' || !process.env.EXPO_PUBLIC_API_URL,
} as const;
