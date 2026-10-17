import { useEffect, useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { BRAND_RINGS, RING_RADIUS, RING_STROKE, RingMasks } from '@/components/BrandSymbol';
import { colors, fonts, palette } from '@/theme';

// Lienzo del frasco: 220×212 unidades, dibujado 1:1 en puntos para que las capas calcen.
const W = 220;
const H = 212;
const CENTER = W / 2;
// Frasco de vidrio con hombros: cuello angosto bajo la tapa y cuerpo ancho.
const BODY_PATH = 'M84 48 C84 64 46 64 46 92 L46 176 Q46 198 68 198 L152 198 Q174 198 174 176 L174 92 C174 64 136 64 136 48 Z';
// Altura útil para las monedas: del fondo del frasco hasta debajo del cuello.
const PILE_BOTTOM = 194;
const PILE_TOP = 72;

// Moneda vista desde arriba en perspectiva.
const COIN_RX = 11;
const COIN_RY = 4.4;
const COIN_EDGE = 3;
const ROW_STEP = 7;
const COIN_STEP = 21;

// Etiqueta colgante con los anillos de la marca (la familia que sostiene el frasco).
const TAG = { x: 166, y: 58, w: 38, h: 30, angle: 12 } as const;
const TAG_RINGS_SIZE = 22;
const RINGS_VIEWBOX_X = 200;
const RINGS_VIEWBOX_Y = 214;
const RINGS_VIEWBOX_SIZE = 624;

const MONTHS = 12;
const MONTH_INITIALS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

type JarIllustrationProps = {
  // Fracción 0..1 de lo que lleva el fondo respecto al año.
  fill: number;
  // Meses del año ya cubiertos por el fondo (0..12), marcados en el camino.
  monthsReached: number;
  description: string;
};

type Coin = { key: string; cx: number; cy: number };

// Ruido determinista (sin Math.random) para que el montón no "baile" en cada render.
function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Monedas apiladas hasta el nivel del fondo; la fila de arriba forma un montoncito, no una línea. */
function buildPile(fill: number): Coin[] {
  if (!(fill > 0)) return [];
  // Con poco fondo igual se ven dos filas: una sola parece una raya, no plata.
  const level = Math.min(PILE_BOTTOM - COIN_EDGE - ROW_STEP, PILE_BOTTOM - fill * (PILE_BOTTOM - PILE_TOP));
  const coins: Coin[] = [];
  for (let row = 0; ; row++) {
    const cy = PILE_BOTTOM - COIN_EDGE - row * ROW_STEP;
    if (cy < level) break;
    // Cerca de la cima la fila se angosta: de 30 a 90 unidades a cada lado del centro.
    const nearTop = Math.min(1, (cy - level) / (ROW_STEP * 2));
    const offset = row % 2 === 0 ? 0 : COIN_STEP / 2;
    for (let x = 40 + offset; x <= 180; x += COIN_STEP) {
      const cx = x + (jitter(row * 31 + x) - 0.5) * 4;
      const reach = 30 + 60 * nearTop + jitter(row * 7 + x) * 14;
      if (Math.abs(cx - CENTER) <= reach) coins.push({ key: `${row}-${x}`, cx, cy: cy + (jitter(x * 3 + row) - 0.5) * 1.5 });
    }
  }
  return coins;
}

function PileCoin({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy + COIN_EDGE} rx={COIN_RX} ry={COIN_RY} fill={palette.money} />
      <Rect x={cx - COIN_RX} y={cy} width={COIN_RX * 2} height={COIN_EDGE} fill={palette.money} />
      <Ellipse cx={cx} cy={cy} rx={COIN_RX} ry={COIN_RY} fill={colors.menta} stroke={palette.money} strokeWidth={0.9} />
      <Ellipse cx={cx} cy={cy} rx={6.4} ry={2.3} fill="none" stroke={palette.money} strokeWidth={0.8} opacity={0.5} />
    </G>
  );
}

/** Los tres anillos de la marca, a escala para caber en la etiqueta. */
function TagRings({ prefix }: { prefix: string }) {
  const scale = TAG_RINGS_SIZE / RINGS_VIEWBOX_SIZE;
  const left = TAG.x + (TAG.w - TAG_RINGS_SIZE) / 2 + 3;
  const top = TAG.y + (TAG.h - TAG_RINGS_SIZE) / 2;
  return (
    <G transform={`translate(${left} ${top}) scale(${scale}) translate(${-RINGS_VIEWBOX_X} ${-RINGS_VIEWBOX_Y})`}>
      <RingMasks prefix={prefix} />
      {BRAND_RINGS.map((ring, i) => (
        <Circle key={i} cx={ring.cx} cy={ring.cy} r={RING_RADIUS} fill="none" stroke={ring.color} strokeWidth={RING_STROKE} mask={`url(#${prefix}-${i})`} />
      ))}
    </G>
  );
}

/** Camino del año: un hito por mes y, al final, la estrella del reparto de diciembre. */
function YearPath({ monthsReached }: { monthsReached: number }) {
  const startX = 14;
  const endX = 246;
  const y = 14;
  const xAt = (i: number) => startX + (i / (MONTHS - 1)) * (endX - startX);
  const progressEnd = monthsReached > 0 ? xAt(Math.min(monthsReached, MONTHS) - 1) : startX;
  return (
    <Svg viewBox="0 0 260 40" width="100%" height={40}>
      <Line x1={startX} y1={y} x2={endX} y2={y} stroke={palette.surface} strokeWidth={4} strokeLinecap="round" />
      {monthsReached > 0 ? <Line x1={startX} y1={y} x2={progressEnd} y2={y} stroke={palette.money} strokeWidth={4} strokeLinecap="round" /> : null}
      {MONTH_INITIALS.map((initial, i) => {
        const x = xAt(i);
        const reached = i < monthsReached;
        const next = i === monthsReached;
        const last = i === MONTHS - 1;
        return (
          <G key={i}>
            {last ? (
              <Path
                d={starPath(x, y, reached ? 9 : 8)}
                fill={reached ? palette.money : palette.surface}
                stroke={reached ? palette.money : palette.border}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            ) : (
              <Circle
                cx={x}
                cy={y}
                r={reached ? 6 : next ? 6 : 4.5}
                fill={reached ? palette.money : palette.surface}
                stroke={reached ? palette.money : next ? palette.accent : palette.border}
                strokeWidth={next ? 2.5 : 2}
              />
            )}
            <SvgText
              x={x}
              y={35}
              fontSize={10}
              fontFamily={reached ? fonts.bodyBold : fonts.body}
              fill={reached ? palette.money : palette.textMuted}
              textAnchor="middle"
            >
              {initial}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function starPath(cx: number, cy: number, r: number): string {
  const inner = r * 0.48;
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : inner;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  });
  return `M${points.join(' L')} Z`;
}

/** Frasco de vidrio que se llena de monedas según el fondo y, debajo, el camino del año. */
export function JarIllustration({ fill, monthsReached, description }: JarIllustrationProps) {
  const reduceMotion = useReducedMotion();
  const prefix = `jar-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pile = useMemo(() => buildPile(fill), [fill]);

  // Al montar o al cambiar el fondo: cae una moneda por la ranura de la tapa y el montón aparece.
  const pileOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const dropY = useSharedValue(-34);
  const dropOpacity = useSharedValue(0);
  const dropScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pileOpacity.value = 1;
      return;
    }
    const ease = Easing.out(Easing.cubic);
    pileOpacity.value = withDelay(120, withTiming(1, { duration: 420, easing: ease }));
    dropY.value = -34;
    dropScale.value = 1;
    dropOpacity.value = withDelay(200, withSequence(withTiming(1, { duration: 120 }), withDelay(420, withTiming(0, { duration: 160 }))));
    dropY.value = withDelay(200, withSequence(withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }), withTiming(8, { duration: 160 })));
    dropScale.value = withDelay(620, withTiming(0.2, { duration: 160 }));
  }, [fill, reduceMotion, pileOpacity, dropY, dropOpacity, dropScale]);

  const pileStyle = useAnimatedStyle(() => ({ opacity: pileOpacity.value }));
  const dropStyle = useAnimatedStyle(() => ({
    opacity: dropOpacity.value,
    transform: [{ translateY: dropY.value }, { scaleY: dropScale.value }],
  }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={description} style={styles.wrap}>
      <View style={styles.canvas}>
        {/* Capa de atrás: sombra en la mesa y el vidrio. */}
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${prefix}-glass`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={palette.border} stopOpacity={0.14} />
              <Stop offset="0.18" stopColor={palette.surface} stopOpacity={0.92} />
              <Stop offset="0.72" stopColor={palette.surface} stopOpacity={0.82} />
              <Stop offset="1" stopColor={palette.border} stopOpacity={0.2} />
            </LinearGradient>
          </Defs>
          <Ellipse cx={CENTER} cy={203} rx={72} ry={5} fill={palette.text} opacity={0.1} />
          <Path d={BODY_PATH} fill={`url(#${prefix}-glass)`} />
        </Svg>

        {/* Monedas dentro del vidrio. */}
        <Animated.View style={[StyleSheet.absoluteFill, pileStyle]}>
          <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <Defs>
              <ClipPath id={`${prefix}-body`}>
                <Path d={BODY_PATH} />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#${prefix}-body)`}>
              {pile.map((coin) => (
                <PileCoin key={coin.key} cx={coin.cx} cy={coin.cy} />
              ))}
            </G>
          </Svg>
        </Animated.View>

        {/* Capa de adelante: brillos del vidrio, contorno, tapa con ranura y etiqueta. */}
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
          <Path d="M58 104 L58 166" stroke={palette.surface} strokeWidth={6} strokeLinecap="round" opacity={0.85} />
          <Circle cx={58} cy={178} r={3} fill={palette.surface} opacity={0.85} />
          <Path d="M62 82 Q70 72 84 68" fill="none" stroke={palette.surface} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
          <Path d={BODY_PATH} fill="none" stroke={palette.text} strokeWidth={3} strokeLinejoin="round" />

          {/* Tapa de rosca con ranura de alcancía. */}
          <Rect x={80} y={30} width={60} height={20} rx={4} fill={palette.primary} />
          {Array.from({ length: 9 }, (_, i) => (
            <Line key={i} x1={86 + i * 6} y1={34} x2={86 + i * 6} y2={46} stroke={palette.accent} strokeWidth={2} strokeLinecap="round" />
          ))}
          <Rect x={74} y={22} width={72} height={11} rx={5.5} fill={palette.primary} />
          <Rect x={96} y={25} width={28} height={4} rx={2} fill={palette.background} opacity={0.9} />

          {/* Cordel y etiqueta con los anillos. */}
          <Path d={`M136 40 Q156 36 ${TAG.x + 6} ${TAG.y + TAG.h / 2}`} fill="none" stroke={palette.border} strokeWidth={1.5} strokeLinecap="round" />
          <G transform={`rotate(${TAG.angle} ${TAG.x} ${TAG.y + TAG.h / 2})`}>
            <Path
              d={`M${TAG.x} ${TAG.y + TAG.h / 2} L${TAG.x + 9} ${TAG.y} L${TAG.x + TAG.w - 5} ${TAG.y} Q${TAG.x + TAG.w} ${TAG.y} ${TAG.x + TAG.w} ${TAG.y + 5} L${TAG.x + TAG.w} ${TAG.y + TAG.h - 5} Q${TAG.x + TAG.w} ${TAG.y + TAG.h} ${TAG.x + TAG.w - 5} ${TAG.y + TAG.h} L${TAG.x + 9} ${TAG.y + TAG.h} Z`}
              fill={palette.surface}
              stroke={palette.text}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <Circle cx={TAG.x + 6} cy={TAG.y + TAG.h / 2} r={2.2} fill={palette.border} />
            <TagRings prefix={`${prefix}-rings`} />
          </G>
        </Svg>

        {/* La moneda que cae por la ranura. */}
        <Animated.View pointerEvents="none" style={[styles.drop, dropStyle]}>
          <Svg width={14} height={22} viewBox="0 0 14 22">
            <Rect x={1} y={1} width={12} height={20} rx={6} fill={colors.menta} stroke={palette.money} strokeWidth={1.6} />
            <Rect x={4.5} y={5} width={5} height={12} rx={2.5} fill="none" stroke={palette.money} strokeWidth={1} opacity={0.6} />
          </Svg>
        </Animated.View>
      </View>
      <YearPath monthsReached={monthsReached} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  canvas: { width: W, height: H },
  // La moneda termina justo sobre la ranura de la tapa (y = 25).
  drop: { position: 'absolute', left: CENTER - 7, top: 6 },
});
