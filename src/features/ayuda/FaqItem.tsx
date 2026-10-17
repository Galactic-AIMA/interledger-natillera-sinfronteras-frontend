import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components';
import { palette, radius, space, touch } from '@/theme';

type FaqItemProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
};

/** Pregunta del acordeón con ícono; la respuesta aparece suave (sin animación si hay movimiento reducido). */
export function FaqItem({ icon, question, answer, open, onToggle }: FaqItemProps) {
  const reduced = useReducedMotion();
  return (
    <Animated.View layout={reduced ? undefined : LinearTransition.duration(200)} style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.question, pressed && { backgroundColor: palette.surfaceSoft }]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={24} color={palette.primary} />
        </View>
        <AppText variant="bodyStrong" style={styles.questionText}>
          {question}
        </AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={24} color={palette.text} />
      </Pressable>
      {open ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.answer}>
          <AppText>{answer}</AppText>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: { borderRadius: radius.lg, borderWidth: 1.5, borderColor: palette.borderSoft, backgroundColor: palette.surface, overflow: 'hidden' },
  question: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touch.buttonHeight, padding: space.lg },
  iconWrap: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceSoft },
  questionText: { flex: 1 },
  answer: { paddingHorizontal: space.lg, paddingBottom: space.lg },
});
