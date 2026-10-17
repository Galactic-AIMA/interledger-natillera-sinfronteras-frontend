import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { ApiError, keys, setActiveNatillera, useApi } from '@/api';
import { AppText, Button, Card, InfoRow, LinkRow, Screen } from '@/components';
import { palette } from '@/theme';

function messageOf(error: unknown, fallback: string): string {
  // El back viejo solo deja una natillera por persona (409 AlreadyMember).
  if (error instanceof ApiError && error.code === 'AlreadyMember') return 'Por ahora cada persona puede estar en una sola natillera. Pronto podrá tener varias.';
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

// 06 · Lo invitaron — vista previa de la invitación y botón para unirse.
export function InvitedToNatillera({ code }: { code: string }) {
  const api = useApi();
  const queryClient = useQueryClient();

  const preview = useQuery({
    queryKey: ['invitation', api.mode, code],
    queryFn: () => api.getInvitation(code),
    retry: false,
  });

  const join = useMutation({
    mutationFn: () => api.joinNatillera(code),
    // La natillera a la que se unió pasa a ser la activa; se quita el código de la ruta para que el
    // index muestre la 10 (con varias natilleras, el código ya no se apaga solo al tener una).
    onSuccess: async (joined) => {
      setActiveNatillera(joined.natilleraId);
      await queryClient.invalidateQueries({ queryKey: keys.natillera });
      router.replace('/natillera');
    },
  });

  if (preview.isLoading) {
    return (
      <Screen title="Mi natillera" inTabs>
        <ActivityIndicator size="large" color={palette.primary} accessibilityLabel="Cargando la invitación" />
        <AppText variant="body" tone="muted" align="center">
          Buscando su invitación…
        </AppText>
      </Screen>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <Screen
        title="Mi natillera"
        inTabs
        footer={
          <>
            <Button label="Probar otro código" onPress={() => router.replace('/natillera/unirse')} />
            <Button label="Reintentar" variant="secondary" onPress={() => void preview.refetch()} />
          </>
        }
      >
        <Card title="No pudimos abrir la invitación" tone="danger">
          <AppText variant="body" tone="danger" accessibilityLiveRegion="polite">
            {messageOf(preview.error, 'Revise el código e intente otra vez.')}
          </AppText>
        </Card>
      </Screen>
    );
  }

  const invitation = preview.data;
  return (
    <Screen
      title="Mi natillera"
      inTabs
      footer={
        <Button
          label="Unirme"
          loading={join.isPending}
          onPress={() => join.mutate()}
        />
      }
    >
      <Card title={`Lo invitaron a ${invitation.natilleraName}`} tone="soft">
        <AppText variant="body">{invitation.adminName} le compartió la invitación.</AppText>
      </Card>
      <Card>
        <InfoRow label="Cuota" amount={invitation.quota} />
      </Card>
      {join.isError ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {messageOf(join.error, 'No pudimos unirlo. Intente otra vez.')}
        </AppText>
      ) : null}
      <LinkRow label="Tengo una invitación" onPress={() => router.replace('/natillera/unirse')} />
    </Screen>
  );
}
