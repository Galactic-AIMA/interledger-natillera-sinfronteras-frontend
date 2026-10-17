import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { colors, fonts } from '@/theme';

import { BRAND_RINGS, RING_RADIUS, RING_STROKE, RingMasks } from './BrandSymbol';

export const SLOGAN = 'Lejos en distancia, juntos en el ahorro.';

// Mismo tamaño y posición que el splash nativo (`imageWidth` en app.json): el relevo no se nota.
const SYMBOL_SIZE = 220;
const LIFT = 84;
// Aire transparente bajo los anillos dentro del PNG (la imagen es cuadrada y los anillos no).
const SYMBOL_BOTTOM_PAD = 47;
const FADE_OUT_MS = 350;
// Duración total pedida: 3 s de splash, contando el desvanecido final.
const TOTAL_MS = 3000;
const HIDE_AT_MS = TOTAL_MS - FADE_OUT_MS;
// Centro de los anillos dentro del símbolo (centroide 512, 540 del viewBox 1024).
const HALO_SIZE = 236;
const HALO_CENTER_Y = (540 / 1024) * SYMBOL_SIZE;

const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
// Cada anillo se traza en RING_MS, uno tras otro con RING_STAGGER_MS de diferencia.
const RING_MS = 560;
const RING_STAGGER_MS = 140;
const RINGS_DONE_MS = RING_MS + RING_STAGGER_MS * (BRAND_RINGS.length - 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Ring({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const ring = BRAND_RINGS[index];
  // progress 0 → anillo vacío; 1 → cerrado.
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - progress.value) }));
  // La máscara va en el grupo y la rotación en el círculo: si la rotación quedara en el mismo
  // elemento que la máscara, también giraría los cortes y los cruces saldrían corridos.
  return (
    <G mask={`url(#splash-ring-${index})`}>
      <AnimatedCircle
        cx={ring.cx}
        cy={ring.cy}
        r={RING_RADIUS}
        fill="none"
        stroke={ring.color}
        strokeWidth={RING_STROKE}
        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        transform={`rotate(${ring.start} ${ring.cx} ${ring.cy})`}
        animatedProps={animatedProps}
      />
    </G>
  );
}

type AnimatedSplashProps = {
  /** Se llama cuando el símbolo ya está pintado; ahí se oculta el splash nativo. */
  onReady: () => void;
  /** Se llama al terminar (o si la persona toca para saltar). */
  onFinish: () => void;
};

/**
 * Continuación animada del splash nativo: los tres anillos se dibujan solos, uno tras otro; al
 * cerrarse el tercero el símbolo se asienta, sube y aparecen el nombre y el slogan.
 * Si el sistema pide reducir movimiento, todo aparece quieto y dura menos.
 */
export function AnimatedSplash({ onReady, onFinish }: AnimatedSplashProps) {
  const reduced = useReducedMotion();
  // Con movimiento reducido el símbolo ya arranca arriba, para que el texto no lo tape.
  const ring0 = useSharedValue(reduced ? 1 : 0);
  const ring1 = useSharedValue(reduced ? 1 : 0);
  const ring2 = useSharedValue(reduced ? 1 : 0);
  const settle = useSharedValue(reduced ? 1 : 0);
  const lift = useSharedValue(reduced ? 1 : 0);
  const name = useSharedValue(reduced ? 1 : 0);
  const slogan = useSharedValue(reduced ? 1 : 0);
  const layer = useSharedValue(1);
  const halo = useSharedValue(reduced ? 1 : 0);
  const ripple = useSharedValue(0);
  const progress = useSharedValue(0);
  // El SVG no tiene que cargar nada: la capa ya está lista al pintarse.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    onReady();
    const ease = Easing.out(Easing.cubic);
    if (!reduced) {
      [ring0, ring1, ring2].forEach((ring, i) => {
        ring.value = withDelay(i * RING_STAGGER_MS, withTiming(1, { duration: RING_MS, easing: ease }));
      });
      // Al cerrarse el tercero, el símbolo se asienta (0.96 → 1) y después sube.
      settle.value = withDelay(RINGS_DONE_MS - 150, withTiming(1, { duration: 300, easing: ease }));
      // Halo suave detrás de los anillos y, al cerrarse el tercero, una onda: la familia quedó unida.
      halo.value = withTiming(1, { duration: 900, easing: ease });
      ripple.value = withDelay(RINGS_DONE_MS - 80, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
      lift.value = withDelay(RINGS_DONE_MS + 60, withTiming(1, { duration: 420, easing: ease }));
      // El texto entra cuando el símbolo ya subió: nunca se enciman, y queda ~1 s para leerlo.
      name.value = withDelay(RINGS_DONE_MS + 300, withTiming(1, { duration: 380, easing: ease }));
      slogan.value = withDelay(RINGS_DONE_MS + 520, withTiming(1, { duration: 380, easing: ease }));
    }
    const hideAt = reduced ? 1400 : HIDE_AT_MS;
    progress.value = withTiming(1, { duration: hideAt, easing: Easing.inOut(Easing.quad) });
    layer.value = withDelay(hideAt, withTiming(0, { duration: FADE_OUT_MS }));
    const timer = setTimeout(onFinish, hideAt + FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [ready, reduced, ring0, ring1, ring2, settle, lift, name, slogan, layer, halo, ripple, progress, onReady, onFinish]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: layer.value }));
  const columnStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -LIFT * lift.value }] }));
  const symbolStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.96 + 0.04 * settle.value }] }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: name.value,
    transform: [{ translateY: (1 - name.value) * 12 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.32 * halo.value,
    transform: [{ scale: 0.7 + 0.3 * halo.value }],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value > 0 ? 0.45 * (1 - ripple.value) : 0,
    transform: [{ scale: 0.85 + 0.75 * ripple.value }],
  }));
  const progressStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const sloganStyle = useAnimatedStyle(() => ({
    opacity: slogan.value,
    transform: [{ translateY: (1 - slogan.value) * 12 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, layerStyle]}>
      <StatusBar style="dark" />
      <Pressable
        style={styles.fill}
        onPress={onFinish}
        accessibilityRole="button"
        accessibilityLabel={`Natillera sin Fronteras. ${SLOGAN}`}
        accessibilityHint="Toque para continuar"
      >
        {/* Símbolo y textos en una sola columna: suben juntos y el texto nunca tapa los anillos. */}
        <Animated.View style={[styles.column, columnStyle]}>
          <Animated.View style={[styles.symbol, symbolStyle]} onLayout={() => setReady(true)}>
            <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
            <Animated.View pointerEvents="none" style={[styles.ripple, rippleStyle]} />
            <Svg width={SYMBOL_SIZE} height={SYMBOL_SIZE} viewBox="0 0 1024 1024">
              <RingMasks prefix="splash-ring" />
              <Ring index={0} progress={ring0} />
              <Ring index={1} progress={ring1} />
              <Ring index={2} progress={ring2} />
            </Svg>
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
        </Animated.View>
        <View style={styles.footer} pointerEvents="none">
          <View style={styles.track}>
            <Animated.View style={[styles.bar, progressStyle]} />
          </View>
          <Text style={styles.credit} maxFontSizeMultiplier={1.2}>
            Pagos entre países con Open Payments
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { backgroundColor: colors.fondo, zIndex: 10 },
  fill: { flex: 1 },
  // Arranca con el símbolo justo en el centro, donde lo deja el splash nativo.
  column: {
    position: 'absolute',
    top: '50%',
    left: 24,
    right: 24,
    marginTop: -SYMBOL_SIZE / 2,
    alignItems: 'center',
  },
  symbol: { width: SYMBOL_SIZE, height: SYMBOL_SIZE },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    left: (SYMBOL_SIZE - HALO_SIZE) / 2,
    top: HALO_CENTER_Y - HALO_SIZE / 2,
    backgroundColor: colors.menta,
  },
  ripple: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    left: (SYMBOL_SIZE - HALO_SIZE) / 2,
    top: HALO_CENTER_Y - HALO_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.verdeDinero,
  },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 48, alignItems: 'center', gap: 12 },
  // La barra se llena en lo que dura el splash; crece desde el centro.
  track: { width: 120, height: 3, borderRadius: 2, backgroundColor: colors.menta, overflow: 'hidden' },
  bar: { width: '100%', height: '100%', backgroundColor: colors.verdeDinero },
  credit: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, color: colors.gris, letterSpacing: 0.3 },
  texts: { marginTop: 28 - SYMBOL_BOTTOM_PAD, alignItems: 'center' },
  name: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, color: colors.indigo, textAlign: 'center' },
  borderless: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 3,
    color: colors.verdeDinero,
    textAlign: 'center',
    marginTop: 4,
  },
  slogan: {
    fontFamily: fonts.bodyMedium,
    fontSize: 21,
    lineHeight: 29,
    color: colors.indigo,
    textAlign: 'center',
    marginTop: 28,
  },
});
