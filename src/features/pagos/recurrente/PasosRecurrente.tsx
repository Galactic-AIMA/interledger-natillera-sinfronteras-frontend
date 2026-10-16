import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components';
import { palette, space } from '@/theme';

const STEPS = ['La app llama al backend', 'Se abre la billetera para dar el permiso', 'El backend cobra la cuota en cada periodo'] as const;

/** Los 3 pasos de "Qué pasa al tocar el botón" (12). */
export function PasosRecurrente() {
  return (
    <View style={styles.list}>
      {STEPS.map((text, i) => (
        <View key={text} style={styles.row} accessible accessibilityLabel={`Paso ${i + 1}. ${text}`}>
          <View style={styles.circle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AppText variant="bodyStrong" tone="onPrimary" align="center">
              {i + 1}
            </AppText>
          </View>
          <AppText variant="body" style={styles.text}>
            {text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  text: { flex: 1, flexShrink: 1 },
});
