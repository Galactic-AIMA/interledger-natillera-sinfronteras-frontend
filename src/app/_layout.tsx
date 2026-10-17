import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiProvider } from '@/api';
import { AnimatedSplash } from '@/components';
import { DevLogOverlay } from '@/features/registro/DevLogOverlay';
import { appFonts, palette, TextScaleProvider } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } }));

  const [showIntro, setShowIntro] = useState(true);
  // El splash nativo se oculta cuando la capa animada ya está pintada encima, sin parpadeo.
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);
  const finishIntro = useCallback(() => setShowIntro(false), []);

  // Si las fuentes fallan seguimos con las del sistema: mejor eso que una pantalla en blanco.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <TextScaleProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
              <Stack.Screen name="billetera/antes" options={{ presentation: 'modal' }} />
              <Stack.Screen name="billetera/volviendo" options={{ gestureEnabled: false }} />
              <Stack.Screen name="resultado" options={{ gestureEnabled: false }} />
            </Stack>
            <DevLogOverlay />
            {showIntro && <AnimatedSplash onReady={hideNativeSplash} onFinish={finishIntro} />}
          </TextScaleProvider>
        </ApiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
