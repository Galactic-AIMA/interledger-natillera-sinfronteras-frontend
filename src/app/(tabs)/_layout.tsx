import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { useApiContext } from '@/api';
import { fonts, palette } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tabIcon =
  (name: IconName) =>
  ({ focused, size }: { focused: boolean; size: number }) => (
    <Ionicons name={name} color={focused ? palette.primary : palette.textMuted} size={size + 2} />
  );

// Pestañas de los bocetos: Mi natillera · Pagar · Ayuda.
export default function TabsLayout() {
  const { session } = useApiContext();
  if (session === 'signed-out') return <Redirect href="/bienvenida" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.borderSoft, minHeight: 64 },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 14 },
      }}
    >
      <Tabs.Screen name="natillera" options={{ title: 'Mi natillera', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="pagar" options={{ title: 'Pagar', tabBarIcon: tabIcon('paper-plane-outline') }} />
      <Tabs.Screen name="ayuda" options={{ title: 'Ayuda', tabBarIcon: tabIcon('help-circle-outline') }} />
    </Tabs>
  );
}
