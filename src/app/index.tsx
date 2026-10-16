import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

// Pantalla provisional; la pantalla 01 · Bienvenida la construye el carril `cuenta-natillera`.
export default function WelcomePlaceholder() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Natillera' }} />
      <Text style={styles.title}>Ahorre en familia</Text>
      <Text style={styles.subtitle}>Aunque vivan en países distintos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 32, color: colors.indigo, fontWeight: '700' },
  subtitle: { fontSize: 18, color: colors.gris },
});
