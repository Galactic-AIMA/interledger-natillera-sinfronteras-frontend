import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { palette, radius, space } from '@/theme';

import { AppText } from './AppText';

type CardProps = {
  title?: string;
  children?: ReactNode;
  tone?: 'default' | 'soft' | 'danger';
  style?: ViewStyle;
};

/** Tarjeta con borde, como los bloques de los bocetos ("Su ahorro", "Resumen"…). */
export function Card({ title, children, tone = 'default', style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        tone === 'soft' && { backgroundColor: palette.surfaceSoft, borderColor: palette.surfaceSoft },
        tone === 'danger' && { borderColor: palette.danger },
        style,
      ]}
    >
      {title ? (
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderSoft,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
});
