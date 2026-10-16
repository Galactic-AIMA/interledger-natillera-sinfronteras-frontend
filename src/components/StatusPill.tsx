import { StyleSheet, View } from 'react-native';

import { palette, radius, space } from '@/theme';

import { AppText } from './AppText';

type Tone = 'ok' | 'pending' | 'danger' | 'neutral';

const TONE: Record<Tone, { bg: string; text: 'money' | 'default' | 'danger' | 'muted' }> = {
  ok: { bg: '#E3F0EA', text: 'money' },
  pending: { bg: '#E8EAF5', text: 'default' },
  danger: { bg: '#F6E5E1', text: 'danger' },
  neutral: { bg: '#ECEDF1', text: 'muted' },
};

/** Etiqueta de estado con texto (nunca solo color): "Al día", "Falta 2", "Pendiente", "En mora". */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <AppText variant="label" tone={t.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill },
});
