import { useLocalSearchParams } from 'expo-router';

import { useMyNatillera } from '@/api';
import { Screen } from '@/components';
import { HomeNatillera } from '@/features/natillera/HomeNatillera';
import { InvitedToNatillera } from '@/features/natillera/InvitedToNatillera';
import { NoNatillera } from '@/features/natillera/NoNatillera';

// 05 · 06 · 10 — una sola ruta; el estado de useMyNatillera() decide cuál se pinta.
export default function ScreenNatilleraIndex() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { data: natillera, isLoading, isError } = useMyNatillera();

  if (isLoading) return <Screen title="Mi natillera" inTabs>{null}</Screen>;
  // Si falló la carga, HomeNatillera pinta el error con reintento (no confundir con «sin natillera»).
  if (natillera || isError) return <HomeNatillera />;
  if (code) return <InvitedToNatillera code={code} />;
  return <NoNatillera />;
}
