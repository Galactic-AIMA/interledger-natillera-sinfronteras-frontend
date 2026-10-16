import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApiContext } from '@/api';
import { AppText, Button, Screen } from '@/components';
import { FadeIn } from '@/features/auth/FadeIn';
import { JarIllustration } from '@/features/auth/JarIllustration';
import { palette, radius, space } from '@/theme';

// 01 · Bienvenida. "Empezar con datos de ejemplo" activa el modo demo (plan B del pitch).
export default function Bienvenida() {
  const { enterDemo } = useApiContext();
  const [loadingDemo, setLoadingDemo] = useState(false);

  async function startDemo() {
    setLoadingDemo(true);
    await enterDemo();
    router.replace('/natillera');
  }

  return (
    <Screen
      title="Natillera"
      footer={
        <FadeIn delay={300}>
          <View style={styles.footer}>
            <Button label="Crear mi cuenta" onPress={() => router.push('/crear-cuenta')} />
            <Button label="Ya tengo cuenta" variant="secondary" onPress={() => router.push('/entrar')} />
            <Button
              label="Empezar con datos de ejemplo"
              variant="ghost"
              loading={loadingDemo}
              accessibilityHint="Abre la app con la natillera de ejemplo de Doña Rosa, sin mover plata real"
              onPress={startDemo}
            />
          </View>
        </FadeIn>
      }
    >
      <FadeIn>
        <View style={styles.hero} accessible accessibilityRole="image" accessibilityLabel="Dibujo de una alcancía con monedas y una familia alrededor">
          <JarIllustration />
        </View>
      </FadeIn>
      <FadeIn delay={120}>
        <View style={styles.texts}>
          <AppText variant="display" align="center">
            Ahorre en familia
          </AppText>
          <AppText variant="body" tone="muted" align="center">
            Aunque vivan en países distintos.
          </AppText>
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xl,
    backgroundColor: palette.surfaceSoft,
    borderRadius: radius.lg,
  },
  texts: { gap: space.sm },
  footer: { gap: space.sm },
});
