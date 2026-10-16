import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, space, touch, useTextScale } from '@/theme';

import { AppText } from './AppText';

type ScreenProps = {
  title: string;
  children: ReactNode;
  // Botones fijos abajo (fuera del scroll), p. ej. "Poner la cuota".
  footer?: ReactNode;
  // Pantallas dentro de las pestañas: la barra ya respeta el borde inferior.
  inTabs?: boolean;
  // Encabezado propio a la izquierda del título (p. ej. volver).
  headerLeft?: ReactNode;
  // Acción a la derecha del título, antes del A+ (p. ej. «Su cuenta»).
  headerRight?: ReactNode;
};

/** Botón A+ del encabezado: agranda el texto de toda la app (3 niveles). */
export function TextSizeButton() {
  const { cycle, level } = useTextScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Agrandar la letra"
      accessibilityHint={`Tamaño ${level + 1} de 3. Toque para cambiarlo.`}
      onPress={cycle}
      hitSlop={8}
      style={styles.aPlus}
    >
      <AppText variant="bodyStrong">A+</AppText>
    </Pressable>
  );
}

/** Estructura de toda pantalla: encabezado (título + A+), contenido con scroll y pie opcional. */
export function Screen({ title, children, footer, inTabs = false, headerLeft, headerRight }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={inTabs ? ['top'] : ['top', 'bottom']}>
      <View style={styles.header}>
        {headerLeft}
        <AppText variant="title" accessibilityRole="header" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
        {headerRight}
        <TextSizeButton />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  title: { flex: 1 },
  aPlus: {
    minWidth: touch.minHeight,
    minHeight: touch.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  footer: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: palette.borderSoft },
});
