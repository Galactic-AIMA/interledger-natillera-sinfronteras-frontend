import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Share } from 'react-native';

import { useMyNatillera } from '@/api';
import { AppText, Button, Card, Screen } from '@/components';
import { InviteQr } from '@/features/natillera/InviteQr';
import { palette } from '@/theme';

// 09 · Invite a su familia
export default function ScreenNatilleraInvitacion() {
  const { data: natillera, isLoading, isError, refetch } = useMyNatillera();
  const [shareError, setShareError] = useState(false);

  async function share() {
    if (!natillera) return;
    setShareError(false);
    try {
      // expo-clipboard no está instalado: el panel de compartir ofrece "Copiar" en el celular.
      await Share.share({
        message: `Lo invito a ${natillera.natilleraName}. Código: ${natillera.invitationCode}\n${natillera.joinUrl}`,
      });
    } catch {
      setShareError(true);
    }
  }

  if (isLoading) {
    return (
      <Screen title="Invite a su familia" inTabs>
        <ActivityIndicator size="large" color={palette.primary} accessibilityLabel="Cargando la invitación" />
      </Screen>
    );
  }

  if (isError || !natillera) {
    return (
      <Screen
        title="Invite a su familia"
        inTabs
        footer={<Button label={isError ? 'Intentar de nuevo' : 'Ir a mi natillera'} onPress={isError ? () => void refetch() : () => router.replace('/natillera')} />}
      >
        <AppText variant="body" tone={isError ? 'danger' : 'default'}>
          {isError ? 'No pudimos cargar la invitación.' : 'Todavía no tiene natillera para invitar.'}
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen
      title="Invite a su familia"
      inTabs
      footer={
        <>
          <Button label="Copiar el enlace" onPress={share} accessibilityHint="Abre las opciones para copiar o compartir el enlace" />
          <Button label="Ir a mi natillera" variant="secondary" onPress={() => router.replace('/natillera')} />
        </>
      }
    >
      <InviteQr value={natillera.joinUrl} />
      <Card tone="soft">
        <AppText variant="label" tone="muted" align="center">
          Código de la invitación
        </AppText>
        <AppText variant="amountLarge" align="center" selectable>
          {natillera.invitationCode}
        </AppText>
      </Card>
      <AppText variant="caption" tone="muted" align="center" selectable>
        {natillera.joinUrl}
      </AppText>
      {shareError ? (
        <AppText variant="body" tone="danger" accessibilityLiveRegion="polite">
          No pudimos abrir las opciones para compartir. Intente otra vez.
        </AppText>
      ) : null}
    </Screen>
  );
}
