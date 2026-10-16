import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useApiContext } from '@/api';
import { palette } from '@/theme';

// Punto de entrada: con sesión va a "Mi natillera"; sin sesión, a la bienvenida (01).
export default function Index() {
  const { session } = useApiContext();
  if (session === 'checking') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator size="large" color={palette.primary} accessibilityLabel="Cargando" />
      </View>
    );
  }
  return <Redirect href={session === 'signed-in' ? '/natillera' : '/bienvenida'} />;
}
