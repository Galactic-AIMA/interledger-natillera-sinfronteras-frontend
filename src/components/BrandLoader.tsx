import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { space } from '@/theme';

import { SLOGAN } from './AnimatedSplash';
import { AppText } from './AppText';
import { BrandSymbol, CENTERED_VIEWBOX } from './BrandSymbol';

// Una vuelta cada 2,4 s y una respiración suave de opacidad: calma mientras se espera (issue #6, idea 2).
const TURN_MS = 2400;
const BREATH_MS = 1200;

type BrandLoaderProps = {
  size?: number;
  /** Lo que lee el lector de pantalla mientras se espera. */
  label?: string;
  /** Muestra el slogan debajo (pantallas de carga completas). */
  withSlogan?: boolean;
};

/** Espera con la marca: los tres anillos giran despacio alrededor de su centro. Reemplaza al spinner. */
export function BrandLoader({ size = 96, label = 'Cargando', withSlogan = false }: BrandLoaderProps) {
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  const breath = useSharedValue(0);
  const sloganIn = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    sloganIn.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    turn.value = withRepeat(withTiming(1, { duration: TURN_MS, easing: Easing.linear }), -1);
    breath.value = withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(turn);
      cancelAnimation(breath);
    };
  }, [reduced, turn, breath, sloganIn]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - 0.35 * breath.value,
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));
  const sloganStyle = useAnimatedStyle(() => ({
    opacity: sloganIn.value,
    transform: [{ translateY: (1 - sloganIn.value) * 8 }],
  }));

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={withSlogan ? `${label}. ${SLOGAN}` : label} style={styles.wrap}>
      {/* Con movimiento reducido el símbolo queda quieto: sigue diciendo «espere» sin moverse. */}
      <Animated.View style={style}>
        <BrandSymbol size={size} viewBox={CENTERED_VIEWBOX} />
      </Animated.View>
      {withSlogan ? (
        <Animated.View style={sloganStyle}>
          <AppText variant="body" tone="muted" align="center">
            {SLOGAN.replace(', ', ',\n')}
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.lg },
});
