import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { palette, touch } from '@/theme';

/** Acceso a «Su cuenta» (04) desde el encabezado de Mi natillera. */
export function AccountButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Su cuenta"
      onPress={() => router.push('/cuenta')}
      hitSlop={8}
      style={{ minWidth: touch.minHeight, minHeight: touch.minHeight, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name="person-circle-outline" size={30} color={palette.text} />
    </Pressable>
  );
}
