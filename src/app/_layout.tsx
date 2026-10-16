import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme/colors';

// Layout raíz provisional: el carril `base` lo reemplaza con fuentes, A+, sesión y pestañas.
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.fondo },
          headerTintColor: colors.indigo,
          contentStyle: { backgroundColor: colors.fondo },
        }}
      />
    </>
  );
}
