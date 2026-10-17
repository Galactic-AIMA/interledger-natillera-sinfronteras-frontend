import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { Member } from '@/api/types';
import { AppText } from '@/components';
import { colors, palette, space } from '@/theme';
import { firstName } from '@/utils/names';

// Cadena de anillos: cada socio es un eslabón; se cruzan como en el logo («nadie se sostiene solo»).
const DIAMETER = 60;
const STROKE = 7;
const STEP = 52; // distancia entre centros: menor que el diámetro, así los anillos se cruzan
const MAX_VISIBLE = 5;
// Colores de marca en rotación para los socios al día.
const RING_COLORS = [colors.indigo, colors.verdeDinero, colors.indigo2] as const;
function Chain({ paid }: { paid: readonly boolean[] }) {
  const r = (DIAMETER - STROKE) / 2;
  const width = DIAMETER + STEP * (paid.length - 1);
  // Primero los grises y encima los de color: el color siempre queda adelante.
  const order = paid.map((p, i) => ({ p, i })).sort((x, y) => Number(x.p) - Number(y.p));
  return (
    <Svg width={width} height={DIAMETER}>
      {order.map(({ p, i }) => (
        <Circle
          key={i}
          cx={DIAMETER / 2 + i * STEP}
          cy={DIAMETER / 2}
          r={r}
          fill="none"
          stroke={p ? RING_COLORS[i % RING_COLORS.length] : palette.borderSoft}
          strokeWidth={STROKE}
        />
      ))}
    </Svg>
  );
}

/** Anillos entrelazados: con color = al día con la cuota; en gris = le falta. */
export function MemberRings({ members }: { members: Member[] }) {
  const visible = members.slice(0, MAX_VISIBLE);
  const extra = members.length - visible.length;
  const owing = members.filter((m) => m.status === 'debe');
  const paidCount = members.length - owing.length;
  const label =
    `${paidCount} de ${members.length} socios al día.` +
    (owing.length > 0 ? ` Le falta a: ${owing.map((m) => firstName(m.name)).join(', ')}.` : ' Todos pusieron su cuota.');

  return (
    <View accessible accessibilityLabel={label} style={styles.block}>
      <View style={styles.chain}>
        <Chain paid={visible.map((m) => m.status === 'al-dia')} />
        {extra > 0 ? (
          <AppText variant="bodyStrong" tone="muted" style={styles.more}>
            +{extra}
          </AppText>
        ) : null}
      </View>
      <View style={styles.names}>
        {visible.map((member) => (
          <AppText
            key={member.userId}
            variant="caption"
            tone={member.status === 'al-dia' ? 'default' : 'muted'}
            numberOfLines={1}
            align="center"
            style={styles.name}
          >
            {firstName(member.name)}
          </AppText>
        ))}
      </View>
      <AppText variant="caption" tone="muted">
        Con color: al día · En gris: le falta la cuota
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  chain: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // Cada nombre centrado bajo su anillo: mismo paso que la cadena.
  names: { flexDirection: 'row', marginLeft: (DIAMETER - STEP) / 2 - 2 },
  name: { width: STEP + 4, marginLeft: -2 },
  more: { marginLeft: space.xs },
});
