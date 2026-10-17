import { useLocalSearchParams } from 'expo-router';

import { useMyNatillera } from '@/api';
import { BrandSymbol, Screen } from '@/components';
import { HomeNatillera } from '@/features/natillera/HomeNatillera';
import { InvitedToNatillera } from '@/features/natillera/InvitedToNatillera';
import { NoNatillera } from '@/features/natillera/NoNatillera';

// 05 · 06 · 10 — una sola ruta; el código de invitación y useMyNatillera() deciden cuál se pinta.
export default function ScreenNatilleraIndex() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { data: natillera, isLoading, isError } = useMyNatillera();

  if (isLoading) return <Screen title="Mi natillera" headerLeft={<BrandSymbol />} inTabs>{null}</Screen>;
  // Con un código, la invitación va primero aunque ya tenga natillera: puede unirse a varias.
  if (code) return <InvitedToNatillera code={code} />;
  // Si falló la carga, HomeNatillera pinta el error con reintento (no confundir con «sin natillera»).
  if (natillera || isError) return <HomeNatillera />;
  return <NoNatillera />;
}
