import { useId } from 'react';
import Svg, { Circle, Defs, Mask, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

// Los tres anillos borromeos del logo, con la geometría de assets/brand/splash.svg (viewBox 1024):
// ninguno se sostiene solo, como la natillera. Cada máscara corta el anillo donde pasa por debajo
// de otro. `start` es el ángulo donde arranca el trazo cuando se dibuja (hacia afuera del símbolo).
export const RING_RADIUS = 179;
export const RING_STROKE = 58;
// Ancho del corte en los cruces: 18 px a cada lado del trazo.
export const RING_CUT = RING_STROKE + 36;
export const BRAND_RINGS = [
  { cx: 512, cy: 429, color: colors.indigo, start: -90, cuts: ['M580.5 525.2 A179 179 0 0 1 586.0 651.2', 'M629.6 417.8 A179 179 0 0 1 741.5 476.1'] },
  { cx: 415.9, cy: 595.5, color: colors.verdeDinero, start: 150, cuts: ['M347.4 499.3 A179 179 0 0 1 341.9 373.3', 'M465.0 488.0 A179 179 0 0 1 571.4 420.3'] },
  { cx: 608.1, cy: 595.5, color: colors.indigo2, start: 30, cuts: ['M559.0 703.0 A179 179 0 0 1 452.6 770.7', 'M490.5 606.7 A179 179 0 0 1 378.7 548.4'] },
] as const;

/** Máscaras de los cruces; `prefix` evita que dos símbolos en pantalla compartan ids. */
export function RingMasks({ prefix }: { prefix: string }) {
  return (
    <Defs>
      {BRAND_RINGS.map((ring, i) => (
        <Mask key={i} id={`${prefix}-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
          <Rect width="1024" height="1024" fill="#fff" />
          {ring.cuts.map((d) => (
            <Path key={d} d={d} fill="none" stroke="#000" strokeWidth={RING_CUT} />
          ))}
        </Mask>
      ))}
    </Defs>
  );
}

/** Símbolo fijo de la marca (encabezados). Decorativo: el título de la pantalla ya dice dónde está. */
export function BrandSymbol({ size = 36 }: { size?: number }) {
  const prefix = `brand-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    // El viewBox recorta el aire alrededor de los anillos para que se vea grande a tamaño de ícono.
    <Svg width={size} height={size} viewBox="200 214 624 624" accessible={false} importantForAccessibility="no-hide-descendants">
      <RingMasks prefix={prefix} />
      {BRAND_RINGS.map((ring, i) => (
        <Circle key={i} cx={ring.cx} cy={ring.cy} r={RING_RADIUS} fill="none" stroke={ring.color} strokeWidth={RING_STROKE} mask={`url(#${prefix}-${i})`} />
      ))}
    </Svg>
  );
}
