import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, palette, radius, space, touch, useTextScale } from '@/theme';

import { AppText } from './AppText';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helper?: string;
  error?: string | null;
  // Para montos y códigos: usa la fuente monoespaciada.
  mono?: boolean;
};

/** Campo con etiqueta visible siempre (nunca solo placeholder), ayuda y error junto al campo. */
export function TextField({ label, helper, error, mono, ...inputProps }: TextFieldProps) {
  const { scale } = useTextScale();
  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={helper}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          { fontFamily: mono ? fonts.mono : fonts.body, fontSize: 18 * scale },
          error ? { borderColor: palette.danger } : null,
        ]}
        {...inputProps}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs },
  input: {
    minHeight: touch.buttonHeight,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    backgroundColor: palette.surface,
    color: palette.text,
  },
});
