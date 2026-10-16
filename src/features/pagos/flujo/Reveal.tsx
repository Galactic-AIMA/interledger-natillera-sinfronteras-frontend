import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

type RevealProps = {
  // Posición en la cascada: cada elemento entra 80 ms después del anterior.
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Entrada suave (fundido + 8 px hacia arriba, 250 ms). Respeta "reducir movimiento" del sistema. */
export function Reveal({ index = 0, children, style }: RevealProps) {
  return (
    <Animated.View entering={FadeInDown.duration(250).delay(index * 80).reduceMotion(ReduceMotion.System)} style={style}>
      {children}
    </Animated.View>
  );
}
