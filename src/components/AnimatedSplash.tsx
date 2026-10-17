import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '@/theme';

export const SLOGAN = 'Lejos en distancia, juntos en el ahorro.';

// Mismo tamaño y posición que el splash nativo (`imageWidth` en app.json): el relevo no se nota.
const SYMBOL_SIZE = 220;
const LIFT = 84;
const FADE_OUT_MS = 350;
// Si la imagen no avisa que cargó, no dejamos a nadie mirando el splash nativo.
const READY_FALLBACK_MS = 1500;

type AnimatedSplashProps = {
  /** Se llama cuando el símbolo ya está pintado; ahí se oculta el splash nativo. */
  onReady: () => void;
  /** Se llama al terminar (o si la persona toca para saltar). */
  onFinish: () => void;
};

/**
 * Continuación animada del splash nativo: el símbolo sube y aparecen el nombre y el slogan.
 * Si el sistema pide reducir movimiento, todo aparece quieto y dura menos.
 */
export function AnimatedSplash({ onReady, onFinish }: AnimatedSplashProps) {
  const reduced = useReducedMotion();
  // Con movimiento reducido el símbolo ya arranca arriba, para que el texto no lo tape.
  const lift = useSharedValue(reduced ? 1 : 0);
  const name = useSharedValue(reduced ? 1 : 0);
  const slogan = useSharedValue(reduced ? 1 : 0);
  const layer = useSharedValue(1);
  const [ready, setReady] = useState(false);

  // La animación arranca cuando el símbolo cargó: así el relevo con el splash nativo no parpadea.
  useEffect(() => {
    const fallback = setTimeout(() => setReady(true), READY_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!ready) return;
    onReady();
    const ease = Easing.out(Easing.cubic);
    if (!reduced) {
      lift.value = withDelay(150, withTiming(1, { duration: 500, easing: ease }));
      // El texto entra cuando el símbolo ya subió: nunca se enciman.
      name.value = withDelay(650, withTiming(1, { duration: 450, easing: ease }));
      slogan.value = withDelay(1000, withTiming(1, { duration: 450, easing: ease }));
    }
    const hideAt = reduced ? 1400 : 3000;
    layer.value = withDelay(hideAt, withTiming(0, { duration: FADE_OUT_MS }));
    const timer = setTimeout(onFinish, hideAt + FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [ready, reduced, lift, name, slogan, layer, onReady, onFinish]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: layer.value }));
  const symbolStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -LIFT * lift.value }] }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: name.value,
    transform: [{ translateY: (1 - name.value) * 12 }],
  }));
  const sloganStyle = useAnimatedStyle(() => ({
    opacity: slogan.value,
    transform: [{ translateY: (1 - slogan.value) * 12 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, layerStyle]}>
      <StatusBar style="light" />
      <Pressable
        style={styles.fill}
        onPress={onFinish}
        accessibilityRole="button"
        accessibilityLabel={`Natillera sin Fronteras. ${SLOGAN}`}
        accessibilityHint="Toque para continuar"
      >
        <Animated.View style={[styles.symbol, symbolStyle]}>
          <Image
            source={require('../../assets/brand/splash-icon.png')}
            style={styles.symbolImage}
            onLoad={() => setReady(true)}
            onError={() => setReady(true)}
          />
        </Animated.View>
        <View style={styles.texts}>
          <Animated.View style={nameStyle}>
            <Text style={styles.name} maxFontSizeMultiplier={1.2}>
              Natillera
            </Text>
            <Text style={styles.borderless} maxFontSizeMultiplier={1.2}>
              SIN FRONTERAS
            </Text>
          </Animated.View>
          <Animated.Text style={[styles.slogan, sloganStyle]} maxFontSizeMultiplier={1.3}>
            {SLOGAN.replace(', ', ',\n')}
          </Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { backgroundColor: colors.indigo, zIndex: 10 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  symbol: { width: SYMBOL_SIZE, height: SYMBOL_SIZE },
  symbolImage: { width: SYMBOL_SIZE, height: SYMBOL_SIZE },
  // El dibujo del símbolo, ya subido, termina unos 20 px arriba del centro.
  texts: { position: 'absolute', top: '50%', left: 24, right: 24, marginTop: 8, alignItems: 'center' },
  name: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, color: colors.fondo, textAlign: 'center' },
  borderless: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 3,
    color: colors.menta,
    textAlign: 'center',
    marginTop: 4,
  },
  slogan: {
    fontFamily: fonts.bodyMedium,
    fontSize: 21,
    lineHeight: 29,
    color: colors.fondo,
    textAlign: 'center',
    marginTop: 28,
  },
});
