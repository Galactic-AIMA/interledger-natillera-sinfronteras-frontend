import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components';
import { palette, space } from '@/theme';

import { Reveal } from './Reveal';

type PasoAntesProps = { n: number; title: string; caption: string };

/** Un paso numerado de "Va a su billetera" (28), con entrada escalonada. */
export function PasoAntes({ n, title, caption }: PasoAntesProps) {
  return (
    <Reveal index={n} style={styles.row}>
      <View style={styles.circle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppText variant="heading" tone="onPrimary" align="center">
          {n}
        </AppText>
      </View>
      <View style={styles.text} accessible accessibilityLabel={`Paso ${n}. ${title}. ${caption}`}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="body" tone="muted">
          {caption}
        </AppText>
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  circle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  text: { flex: 1, flexShrink: 1, gap: 2, paddingTop: 2 },
});
