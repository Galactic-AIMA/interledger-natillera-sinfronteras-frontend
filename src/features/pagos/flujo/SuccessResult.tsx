import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, TextSizeButton } from '@/components';
import { palette, space } from '@/theme';

import { Reveal } from './Reveal';

type SuccessResultProps = {
  title: string;
  message?: string;
  children?: ReactNode;
  actions?: ReactNode;
};

/** Resultado ✓ con el check entrando con un resorte sutil. Mismo esqueleto que `ResultScreen`. */
export function SuccessResult({ title, message, children, actions }: SuccessResultProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    progress.value = withSpring(1, { damping: 11, stiffness: 150, mass: 0.8 });
  }, [reduced, progress]);

  const badge = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 5),
    transform: [{ scale: 0.55 + 0.45 * progress.value }],
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <TextSizeButton />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} accessibilityLiveRegion="polite">
        <Animated.View style={[styles.badge, badge]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name="checkmark" size={72} color={palette.money} />
        </Animated.View>
        <Reveal index={1}>
          <AppText variant="title" align="center" accessibilityRole="header">
            {title}
          </AppText>
        </Reveal>
        {message ? (
          <Reveal index={2}>
            <AppText variant="body" tone="muted" align="center">
              {message}
            </AppText>
          </Reveal>
        ) : null}
        {children ? (
          <Reveal index={3} style={styles.summary}>
            {children}
          </Reveal>
        ) : null}
      </ScrollView>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  top: { alignItems: 'flex-end', paddingHorizontal: space.lg },
  scroll: { flex: 1 },
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl, paddingVertical: space.md },
  badge: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceSoft,
    borderWidth: 3,
    borderColor: palette.money,
  },
  summary: { alignSelf: 'stretch' },
  actions: { padding: space.lg, gap: space.sm },
});
