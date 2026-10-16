import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

/** Frasco de ahorro con monedas y tres personas alrededor (la familia). Decorativo. */
export function JarIllustration({ size = 220 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      <Circle cx={110} cy={112} r={100} fill={colors.blanco} opacity={0.55} />
      {/* Frasco */}
      <Rect x={68} y={52} width={84} height={14} rx={5} fill={colors.indigo2} />
      <Path
        d="M74 66 H146 V76 Q158 84 158 100 V160 Q158 178 140 178 H80 Q62 178 62 160 V100 Q62 84 74 76 Z"
        fill={colors.blanco}
        stroke={colors.indigo}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* Ahorro dentro del frasco */}
      <Path d="M66 128 H154 V160 Q154 174 140 174 H80 Q66 174 66 160 Z" fill={colors.menta} />
      <Ellipse cx={92} cy={150} rx={15} ry={6} fill={colors.verdeDinero} />
      <Ellipse cx={122} cy={158} rx={15} ry={6} fill={colors.mentaOscura} />
      <Ellipse cx={106} cy={141} rx={15} ry={6} fill={colors.verdeDinero} />
      {/* Moneda cayendo */}
      <Circle cx={110} cy={36} r={13} fill={colors.verdeDinero} stroke={colors.indigo} strokeWidth={3} />
      <Rect x={108} y={29} width={4} height={14} rx={2} fill={colors.blanco} />
      {/* Familia: tres personas */}
      <G>
        <Circle cx={30} cy={150} r={11} fill={colors.indigo2} />
        <Path d="M12 190 Q12 166 30 166 Q48 166 48 190 Z" fill={colors.indigo2} />
        <Circle cx={190} cy={150} r={11} fill={colors.mentaOscura} />
        <Path d="M172 190 Q172 166 190 166 Q208 166 208 190 Z" fill={colors.mentaOscura} />
        <Circle cx={110} cy={196} r={9} fill={colors.indigo} />
        <Path d="M94 218 Q94 205 110 205 Q126 205 126 218 Z" fill={colors.indigo} />
      </G>
    </Svg>
  );
}
