import { colors } from './colors';

// Colores por intención: los componentes usan estos nombres, nunca hex sueltos.
export const palette = {
  text: colors.indigo,
  textMuted: colors.gris,
  textOnPrimary: colors.blanco,
  primary: colors.indigo,
  primaryPressed: colors.indigo2,
  accent: colors.indigo2,
  background: colors.fondo,
  surface: colors.blanco,
  surfaceSoft: colors.menta,
  border: colors.mentaOscura,
  borderSoft: '#D9DDE6',
  money: colors.verdeDinero,
  danger: colors.alerta,
  wallet: colors.billetera,
} as const;

// Espaciado en múltiplos de 4; pensado para manos y vista de adultos mayores.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

// Área táctil mínima (Android recomienda 48 dp).
export const touch = { minHeight: 48, buttonHeight: 56 } as const;

export const fonts = {
  display: 'Gloock_400Regular',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodyBold: 'HankenGrotesk_700Bold',
  mono: 'MartianMono_400Regular',
  monoBold: 'MartianMono_600SemiBold',
} as const;

// Tamaños base (escala 1×). El botón A+ los multiplica con `textScales`.
export const typeScale = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 25 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  amount: { fontFamily: fonts.monoBold, fontSize: 17, lineHeight: 24 },
  amountLarge: { fontFamily: fonts.monoBold, fontSize: 28, lineHeight: 36 },
} as const;

export type TextVariant = keyof typeof typeScale;

// Niveles del botón A+: normal, grande y muy grande.
export const textScales = [1, 1.2, 1.4] as const;
