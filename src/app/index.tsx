import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useApiContext } from '@/api';
import { BrandLoader } from '@/components';
import { palette } from '@/theme';

// Punto de entrada: con sesión va a "Mi natillera"; sin sesión, a la bienvenida (01).
export default function Index() {
  const { session } = useApiContext();
  if (session === 'checking') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <BrandLoader size={120} withSlogan />
      </View>
    );
  }
  return <Redirect href={session === 'signed-in' ? '/natillera' : '/bienvenida'} />;
}
