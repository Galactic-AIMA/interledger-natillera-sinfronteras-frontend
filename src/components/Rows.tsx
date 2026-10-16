import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Amount } from '@/api/types';
import { palette, radius, space, touch } from '@/theme';
import { formatAmount } from '@/utils/money';

import { AppText } from './AppText';

type InfoRowProps = {
  label: string;
  value?: string;
  amount?: Amount;
  // `money` pinta en verde: solo plata que entra o ahorro que crece.
  tone?: 'default' | 'money' | 'danger' | 'muted';
  signed?: boolean;
  right?: ReactNode;
};

/** Fila etiqueta → valor ("Fondo (suma de aportes)  $150.000"). Los montos van en monoespaciada. */
export function InfoRow({ label, value, amount, tone = 'default', signed, right }: InfoRowProps) {
  const text = amount ? formatAmount(amount, { signed }) : value;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${text ?? ''}`}>
      <AppText variant="body" tone="muted" style={styles.label}>
        {label}
      </AppText>
      {right ?? (
        <AppText variant={amount ? 'amount' : 'bodyStrong'} tone={tone} align="right">
          {text}
        </AppText>
      )}
    </View>
  );
}

type LinkRowProps = {
  label: string;
  onPress: () => void;
  description?: string;
};

/** Fila navegable con flecha ("¿Quién pone?  >"). */
export function LinkRow({ label, description, onPress }: LinkRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={onPress}
      android_ripple={{ color: palette.surfaceSoft }}
      style={({ pressed }) => [styles.link, pressed && { backgroundColor: palette.surfaceSoft }]}
    >
      <View style={styles.linkText}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={24} color={palette.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, minHeight: 32 },
  label: { flexShrink: 1 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touch.buttonHeight,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.borderSoft,
    backgroundColor: palette.surface,
  },
  linkText: { flex: 1, gap: 2 },
});
