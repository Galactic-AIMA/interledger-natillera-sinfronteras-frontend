import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { palette, touch } from '@/theme';

type BackButtonProps = {
  /** A dónde ir si no hay pantalla anterior (p. ej. se abrió por enlace). */
  fallback?: Href;
};

// Botón «Volver» para el encabezado (headerLeft de Screen). En iPhone no hay botón atrás del sistema,
// así que toda pantalla que se abre encima de otra lo necesita. Área táctil ≥ 48 px.
export function BackButton({ fallback = '/natillera' }: BackButtonProps) {
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} hitSlop={8} style={styles.back}>
      <Ionicons name="chevron-back" size={28} color={palette.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { minWidth: touch.minHeight, minHeight: touch.minHeight, alignItems: 'center', justifyContent: 'center' },
});
