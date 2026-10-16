import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { palette, radius, space, touch } from '@/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

const VARIANT_STYLE: Record<Variant, { bg: string; pressed: string; border: string; text: 'onPrimary' | 'default' | 'danger' }> = {
  primary: { bg: palette.primary, pressed: palette.primaryPressed, border: palette.primary, text: 'onPrimary' },
  secondary: { bg: palette.surface, pressed: palette.surfaceSoft, border: palette.primary, text: 'default' },
  ghost: { bg: 'transparent', pressed: palette.surfaceSoft, border: 'transparent', text: 'default' },
  danger: { bg: palette.surface, pressed: '#F4E4E0', border: palette.danger, text: 'danger' },
};

/** Botón de ancho completo, 56 px de alto, con estado de carga para las llamadas al back. */
export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, accessibilityHint }: ButtonProps) {
  const v = VARIANT_STYLE[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: palette.surfaceSoft }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={v.text === 'onPrimary' ? palette.textOnPrimary : palette.primary} /> : null}
        <AppText variant="bodyStrong" tone={v.text} align="center">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.buttonHeight,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
});
