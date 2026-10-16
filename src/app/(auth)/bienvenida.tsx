import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useApiContext } from '@/api';
import { AppText, Button, Screen } from '@/components';
import { palette, space } from '@/theme';

// 01 · Bienvenida. "Empezar con datos de ejemplo" activa el modo demo (plan B del pitch).
export default function Bienvenida() {
  const { enterDemo } = useApiContext();

  return (
    <Screen
      title="Natillera"
      footer={
        <>
          <Button label="Crear mi cuenta" onPress={() => router.push('/crear-cuenta')} />
          <Button label="Ya tengo cuenta" variant="secondary" onPress={() => router.push('/entrar')} />
          <Button
            label="Empezar con datos de ejemplo"
            variant="ghost"
            accessibilityHint="Abre la app con la natillera de ejemplo de Doña Rosa, sin mover plata real"
            onPress={async () => {
              await enterDemo();
              router.replace('/natillera');
            }}
          />
        </>
      }
    >
      <View style={styles.hero} accessible accessibilityLabel="Dibujo de una alcancía">
        <Ionicons name="wallet-outline" size={120} color={palette.money} />
      </View>
      <AppText variant="display" align="center">
        Ahorre en familia
      </AppText>
      <AppText variant="body" tone="muted" align="center">
        Aunque vivan en países distintos.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxl,
    backgroundColor: palette.surfaceSoft,
    borderRadius: 24,
  },
});
