import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  SlideInRight,
  SlideInLeft,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText, Button } from '@/components';
import { palette, radius, space } from '@/theme';

import { GUIDES, type GuideId } from './guides';

type GuideSheetProps = {
  id: GuideId | null;
  /** 'offer' pregunta primero si quiere la guía (la primera vez); 'steps' la muestra de una (desde Ayuda). */
  start: 'offer' | 'steps';
  onClose: () => void;
};

/** Ícono que late suave para llamar la atención sobre el paso (quieto si el sistema pide menos movimiento). */
function PulsingIcon({ name }: { name: React.ComponentProps<typeof Ionicons>['name'] }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    scale.value = withRepeat(withSequence(withTiming(1.12, { duration: 650 }), withTiming(1, { duration: 650 })), -1);
  }, [reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.iconCircle, style]}>
      <Ionicons name={name} size={44} color={palette.primary} />
    </Animated.View>
  );
}

/** Barra de avance que se llena con cada paso. */
function Progress({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const width = useSharedValue(value);
  useEffect(() => {
    width.value = reduced ? value : withTiming(value, { duration: 300 });
  }, [value, reduced, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
}

/** 39 · Guía paso a paso de un proceso, con animación corta. Se cierra en cualquier momento. */
export function GuideSheet({ id, start, onClose }: GuideSheetProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'offer' | 'steps'>(start);
  const [index, setIndex] = useState(0);
  const [forward, setForward] = useState(true);

  useEffect(() => {
    setPhase(start);
    setIndex(0);
  }, [id, start]);

  if (!id) return null;
  const guide = GUIDES[id];
  const step = guide.steps[index];
  const last = index === guide.steps.length - 1;
  const entering = reduced ? undefined : forward ? SlideInRight.duration(260) : SlideInLeft.duration(260);

  const go = (delta: number) => {
    setForward(delta > 0);
    setIndex((i) => i + delta);
  };

  return (
    <Modal visible transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* Con A+ al máximo el paso puede no caber: la hoja se desplaza. */}
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} accessibilityViewIsModal>
          {phase === 'offer' ? (
            <Animated.View entering={reduced ? undefined : FadeIn.duration(250)} style={styles.body}>
              <PulsingIcon name={guide.icon} />
              <AppText variant="title" align="center" accessibilityRole="header">
                ¿Le mostramos cómo se hace?
              </AppText>
              <AppText align="center">
                Es la primera vez que entra a «{guide.title}». Le explicamos paso a paso, en {guide.steps.length} pasos cortos.
              </AppText>
              <Button label="Sí, muéstreme" onPress={() => setPhase('steps')} />
              <Button label="Ahora no" variant="ghost" onPress={onClose} />
              <AppText variant="caption" tone="muted" align="center">
                Puede verla cuando quiera en Ayuda.
              </AppText>
            </Animated.View>
          ) : (
            <View style={styles.body}>
              <AppText variant="label" tone="muted" align="center">
                {guide.title} · Paso {index + 1} de {guide.steps.length}
              </AppText>
              <Progress value={(index + 1) / guide.steps.length} />
              <Animated.View key={index} entering={entering} style={styles.step} accessibilityLiveRegion="polite">
                <PulsingIcon name={step.icon} />
                <AppText variant="heading" align="center" accessibilityRole="header">
                  {step.title}
                </AppText>
                <AppText align="center">{step.text}</AppText>
              </Animated.View>
              <Button label={last ? 'Listo, entendí' : 'Siguiente'} onPress={last ? onClose : () => go(1)} />
              {index > 0 ? <Button label="Atrás" variant="secondary" onPress={() => go(-1)} /> : null}
              {!last ? <Button label="Cerrar la guía" variant="ghost" onPress={onClose} /> : null}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 22, 40, 0.55)', justifyContent: 'center', padding: space.lg },
  sheet: { flexGrow: 0, maxHeight: '92%', backgroundColor: palette.surface, borderRadius: radius.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  sheetContent: { padding: space.xl },
  body: { gap: space.md },
  step: { alignItems: 'center', gap: space.md, paddingVertical: space.md },
  iconCircle: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: palette.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: palette.borderSoft, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: palette.money },
});
