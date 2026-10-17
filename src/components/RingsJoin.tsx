import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { palette } from '@/theme';

import { BRAND_RINGS, CENTERED_VIEWBOX, RING_RADIUS, RING_STROKE, RingMasks } from './BrandSymbol';

const PREFIX = 'join-ring';
// El anillo que cambia de gris a su color es el de quien acaba de pagar.
const JOINING = 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const DRAW_MS = 700;
const SETTLE_MS = 350;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingProps = { index: number; color: string };

/** Anillo completo (sin animar). La máscara va en el grupo y la rotación en el círculo, nunca juntas. */
function StaticRing({ index, color }: RingProps) {
  const ring = BRAND_RINGS[index];
  return (
    <G mask={`url(#${PREFIX}-${index})`}>
      <Circle
        cx={ring.cx}
        cy={ring.cy}
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={RING_STROKE}
        transform={`rotate(${ring.start} ${ring.cx} ${ring.cy})`}
      />
    </G>
  );
}

/**
 * Los tres anillos del logo: dos ya en su color y el de quien pagó pasa de contorno gris a su color,
 * quedando enlazado con los otros. Luego el símbolo se asienta (0.96 → 1), sin rebotes.
 * Con movimiento reducido aparece directo en el estado final.
 */
export function RingsJoin({ size = 140 }: { size?: number }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  const settle = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const ease = Easing.out(Easing.cubic);
    progress.value = withTiming(1, { duration: DRAW_MS, easing: ease });
    settle.value = withDelay(DRAW_MS - 150, withTiming(1, { duration: SETTLE_MS, easing: ease }));
  }, [reduced, progress, settle]);

  const joining = BRAND_RINGS[JOINING];
  const drawProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - progress.value) }));
  const settleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.96 + 0.04 * settle.value }] }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Su aporte ya está en la natillera">
      <Animated.View style={settleStyle}>
        <Svg width={size} height={size} viewBox={CENTERED_VIEWBOX}>
          <RingMasks prefix={PREFIX} />
          {BRAND_RINGS.map((ring, i) =>
            i === JOINING ? null : <StaticRing key={i} index={i} color={ring.color} />,
          )}
          {/* Contorno gris de fondo y encima el color que se traza hasta cerrarse. */}
          <StaticRing index={JOINING} color={palette.borderSoft} />
          <G mask={`url(#${PREFIX}-${JOINING})`}>
            <AnimatedCircle
              cx={joining.cx}
              cy={joining.cy}
              r={RING_RADIUS}
              fill="none"
              stroke={joining.color}
              strokeWidth={RING_STROKE}
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              transform={`rotate(${joining.start} ${joining.cx} ${joining.cy})`}
              animatedProps={drawProps}
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
