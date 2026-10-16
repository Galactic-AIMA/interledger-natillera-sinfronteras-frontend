import { useEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

type FadeInProps = { children: ReactNode; delay?: number };

/** Entrada suave (opacidad + subida corta, 250 ms). Sin movimiento si el sistema pide reducirlo. */
export function FadeIn({ children, delay = 0 }: FadeInProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withTiming(1, { duration: 250 }));
  }, [reduced, delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
