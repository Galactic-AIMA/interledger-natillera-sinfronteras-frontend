import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { palette } from '@/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Geometría del frasco en un viewBox de 120×140.
const BODY_TOP = 34;
const BODY_BOTTOM = 130;
const BODY_PATH = 'M30 34 Q18 40 18 58 L18 112 Q18 130 36 130 L84 130 Q102 130 102 112 L102 58 Q102 40 90 34 Z';
const MONTHS = 12;

type JarIllustrationProps = {
  // Fracción 0..1 de lo que lleva el fondo respecto al año.
  fill: number;
  // Meses del año ya cubiertos por el fondo (0..12), marcados en el camino.
  monthsReached: number;
  description: string;
};

/** Frasco que se llena según el fondo y, debajo, el camino del año con un hito por mes. */
export function JarIllustration({ fill, monthsReached, description }: JarIllustrationProps) {
  const reduceMotion = useReducedMotion();
  const level = useSharedValue(reduceMotion ? fill : 0);

  useEffect(() => {
    // Llenado al montar o al cambiar el fondo; sin animación si la persona pidió reducir movimiento.
    level.value = reduceMotion ? fill : withTiming(fill, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [fill, level, reduceMotion]);

  const liquidProps = useAnimatedProps(() => {
    const height = (BODY_BOTTOM - BODY_TOP) * level.value;
    return { y: BODY_BOTTOM - height, height };
  });

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={description}>
      <Svg viewBox="0 0 120 140" width="100%" height={170}>
        <Defs>
          <ClipPath id="jarBody">
            <Path d={BODY_PATH} />
          </ClipPath>
        </Defs>
        <Path d={BODY_PATH} fill={palette.surface} />
        <AnimatedRect x={0} width={120} fill={palette.money} opacity={0.85} clipPath="url(#jarBody)" animatedProps={liquidProps} />
        <Path d={BODY_PATH} fill="none" stroke={palette.text} strokeWidth={3} strokeLinejoin="round" />
        <Rect x={34} y={20} width={52} height={14} rx={4} fill={palette.surfaceSoft} stroke={palette.text} strokeWidth={3} />
      </Svg>
      <Svg viewBox="0 0 240 36" width="100%" height={36}>
        <Path d="M12 20 Q66 2 120 20 T228 20" fill="none" stroke={palette.border} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
        {Array.from({ length: MONTHS }, (_, i) => {
          const x = 12 + (i / (MONTHS - 1)) * 216;
          const reached = i < monthsReached;
          return (
            <Circle
              key={i}
              cx={x}
              cy={20}
              r={reached ? 7 : 5}
              fill={reached ? palette.money : palette.surface}
              stroke={reached ? palette.money : palette.border}
              strokeWidth={2.5}
            />
          );
        })}
      </Svg>
    </View>
  );
}
