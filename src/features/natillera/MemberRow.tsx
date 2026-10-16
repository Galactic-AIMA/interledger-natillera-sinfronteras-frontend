import { StyleSheet, View } from 'react-native';

import type { Member } from '@/api';
import { AppText, StatusPill } from '@/components';
import { palette, radius, space } from '@/theme';
import { formatAmount } from '@/utils/money';

/** Fila de un socio: nombre, cuánto ha puesto y si está al día o cuántas cuotas le faltan. */
export function MemberRow({ member }: { member: Member }) {
  const upToDate = member.status === 'al-dia';
  const pillLabel = upToDate ? 'Al día' : `Falta ${member.pendingCount}`;
  const name = member.isAdmin ? `${member.name} · tesorera` : member.name;
  const total = formatAmount(member.total);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${name}. Ha puesto ${total}. ${pillLabel}`}>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{name}</AppText>
        <AppText variant="body" tone="muted">
          Ha puesto {total}
        </AppText>
      </View>
      <StatusPill label={pillLabel} tone={upToDate ? 'ok' : 'danger'} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 64,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.borderSoft,
    backgroundColor: palette.surface,
  },
  text: { flex: 1, gap: 2 },
});
