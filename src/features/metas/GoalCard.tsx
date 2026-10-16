import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Goal } from '@/api/types';
import { AppText, StatusPill } from '@/components';
import { palette, radius, space } from '@/theme';
import { formatAmount } from '@/utils/money';

import { daysLeftLabel, isReached, progress } from './goalMath';

/** Barra de avance de una meta. Verde: es ahorro que crece. */
export function GoalProgress({ goal }: { goal: Goal }) {
  const pct = Math.round(progress(goal) * 100);
  return (
    <View
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Llevan ${formatAmount(goal.raised)} de ${formatAmount(goal.target)}`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View style={[styles.fill, { width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }]} />
    </View>
  );
}

export function modeLabel(goal: Goal): string {
  return goal.mode === 'colecta' ? 'Colecta' : 'Ahorro';
}

/** Tarjeta de una meta en las listas (10 y 36). */
export function GoalCard({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const reached = isReached(goal);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}. ${modeLabel(goal)}. Llevan ${formatAmount(goal.raised)} de ${formatAmount(goal.target)}. ${reached ? 'Meta cumplida' : daysLeftLabel(goal.deadline)}`}
      onPress={onPress}
      android_ripple={{ color: palette.surfaceSoft }}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: palette.background }]}
    >
      <View style={styles.header}>
        <View style={styles.title}>
          <AppText variant="bodyStrong">{goal.name}</AppText>
          <AppText variant="caption" tone="muted">
            {goal.mode === 'colecta' && goal.beneficiaryName ? `Colecta para ${goal.beneficiaryName}` : modeLabel(goal)}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={palette.textMuted} />
      </View>
      <GoalProgress goal={goal} />
      <View style={styles.footer}>
        <AppText variant="amount" tone="money">
          {formatAmount(goal.raised)}
        </AppText>
        <AppText variant="caption" tone="muted">
          de {formatAmount(goal.target)}
        </AppText>
      </View>
      <StatusPill label={reached ? '¡Meta cumplida!' : daysLeftLabel(goal.deadline)} tone={reached ? 'ok' : 'neutral'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    backgroundColor: palette.surface,
    minHeight: 48,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, gap: 2 },
  track: { height: 12, borderRadius: radius.pill, backgroundColor: palette.borderSoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.money },
  footer: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
});
