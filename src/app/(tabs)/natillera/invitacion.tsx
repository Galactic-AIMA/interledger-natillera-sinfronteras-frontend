import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Share } from 'react-native';

import { useMyNatillera } from '@/api';
import { AppText, Button, Card, Screen } from '@/components';
import { InviteQr } from '@/features/natillera/InviteQr';
import { palette } from '@/theme';
import { BackButton } from '@/features/navegacion/BackButton';

// 09 · Invite a su familia
export default function ScreenNatilleraInvitacion() {
  const { data: natillera, isLoading, isError, refetch } = useMyNatillera();
  const [shareError, setShareError] = useState(false);

  const [copied, setCopied] = useState(false);

  function inviteText() {
    return natillera ? `Lo invito a ${natillera.natilleraName}. Código: ${natillera.invitationCode}\n${natillera.joinUrl}` : '';
  }

  async function copy() {
    if (!natillera) return;
    setShareError(false);
    try {
      await Clipboard.setStringAsync(inviteText());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setShareError(true);
    }
  }

  async function share() {
    if (!natillera) return;
    setShareError(false);
    try {
      await Share.share({ message: inviteText() });
    } catch {
      setShareError(true);
    }
  }

  if (isLoading) {
    return (
      <Screen headerLeft={<BackButton />} title="Invite a su familia" inTabs>
        <ActivityIndicator size="large" color={palette.primary} accessibilityLabel="Cargando la invitación" />
      </Screen>
    );
  }

  if (isError || !natillera) {
    return (
      <Screen headerLeft={<BackButton />}
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
    <Screen headerLeft={<BackButton />}
      title="Invite a su familia"
      inTabs
      footer={
        <>
          <Button label={copied ? 'Enlace copiado ✓' : 'Copiar el enlace'} onPress={copy} accessibilityHint="Copia la invitación para pegarla en un mensaje" />
          <Button label="Compartir" variant="secondary" onPress={share} accessibilityHint="Abre las opciones para enviar la invitación" />
          <Button label="Ir a mi natillera" variant="ghost" onPress={() => router.replace('/natillera')} />
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
      {copied ? (
        <AppText variant="body" align="center" accessibilityLiveRegion="polite">
          Enlace copiado. Péguelo en un mensaje para su familia.
        </AppText>
      ) : null}
      {shareError ? (
        <AppText variant="body" tone="danger" accessibilityLiveRegion="polite">
          No pudimos copiar ni compartir la invitación. Intente otra vez.
        </AppText>
      ) : null}
    </Screen>
  );
}
