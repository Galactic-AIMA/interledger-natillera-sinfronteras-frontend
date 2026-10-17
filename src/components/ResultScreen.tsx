import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, space } from '@/theme';

import { AppText } from './AppText';
import { BrandLoader } from './BrandLoader';
import { TextSizeButton } from './Screen';

type Kind = 'success' | 'rejected' | 'error' | 'loading';

const ICON: Record<Exclude<Kind, 'loading'>, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: palette.money },
  rejected: { name: 'close-circle', color: palette.danger },
  error: { name: 'alert-circle', color: palette.danger },
};

type ResultScreenProps = {
  kind: Kind;
  title: string;
  message?: string;
  // Resumen opcional (normalmente una <Card> con <InfoRow>).
  children?: ReactNode;
  // Botones (Listo, Intentar de nuevo, Volver).
  actions?: ReactNode;
};

/** Pantallas de resultado ✓ ✕ ! y de espera: 14, 19, 23, 30, 31, 32, 33 y 34. */
export function ResultScreen({ kind, title, message, children, actions }: ResultScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <TextSizeButton />
      </View>
      <View style={styles.body} accessibilityLiveRegion="polite">
        {kind === 'loading' ? (
          <BrandLoader />
        ) : (
          <Ionicons name={ICON[kind].name} size={88} color={ICON[kind].color} accessibilityElementsHidden />
        )}
        <AppText variant="title" align="center" accessibilityRole="header">
          {title}
        </AppText>
        {message ? (
          <AppText variant="body" tone="muted" align="center">
            {message}
          </AppText>
        ) : null}
        {children ? <View style={styles.summary}>{children}</View> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  top: { alignItems: 'flex-end', paddingHorizontal: space.lg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl },
  summary: { alignSelf: 'stretch' },
  actions: { padding: space.lg, gap: space.sm },
});
