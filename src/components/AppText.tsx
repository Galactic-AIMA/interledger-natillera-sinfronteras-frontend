import { Text, type TextProps } from 'react-native';

import { palette, typeScale, useTextScale, type TextVariant } from '@/theme';

type Tone = 'default' | 'muted' | 'money' | 'danger' | 'onPrimary' | 'accent';

const TONE_COLOR: Record<Tone, string> = {
  default: palette.text,
  muted: palette.textMuted,
  money: palette.money,
  danger: palette.danger,
  onPrimary: palette.textOnPrimary,
  accent: palette.accent,
};

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
};

/** Único componente de texto de la app: aplica fuente, color y la escala del botón A+. */
export function AppText({ variant = 'body', tone = 'default', align, style, ...rest }: AppTextProps) {
  const { scale } = useTextScale();
  const base = typeScale[variant];
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[
        base,
        { fontSize: base.fontSize * scale, lineHeight: base.lineHeight * scale, color: TONE_COLOR[tone] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
