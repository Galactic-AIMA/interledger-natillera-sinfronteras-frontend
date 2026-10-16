import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useMyNatillera } from '@/api';
import { AppText, Button, Card, Screen } from '@/components';
import { MemberRow } from '@/features/natillera/MemberRow';
import { palette } from '@/theme';
import { BackButton } from '@/features/navegacion/BackButton';

// 15 · ¿Quién pone?
export default function ScreenNatilleraQuienPone() {
  const { data: natillera, isLoading, isError, refetch, isFetching } = useMyNatillera();

  if (isLoading) {
    return (
      <Screen headerLeft={<BackButton />} title="¿Quién pone?" inTabs>
        <View style={{ alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={palette.primary} accessibilityLabel="Cargando los socios" />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen headerLeft={<BackButton />} title="¿Quién pone?" inTabs footer={<Button label="Intentar de nuevo" onPress={() => refetch()} loading={isFetching} />}>
        <Card tone="danger" title="No pudimos cargar los socios">
          <AppText>Revise su conexión e inténtelo otra vez.</AppText>
        </Card>
      </Screen>
    );
  }

  if (!natillera) {
    return (
      <Screen headerLeft={<BackButton />} title="¿Quién pone?" inTabs footer={<Button label="Ir a Mi natillera" onPress={() => router.replace('/natillera')} />}>
        <Card tone="soft" title="Todavía no tiene natillera">
          <AppText>Cuando cree una o se una a una, aquí verá quién ha puesto su cuota.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen headerLeft={<BackButton />} title="¿Quién pone?" inTabs footer={<Button label="Invitar a alguien" onPress={() => router.push('/natillera/invitacion')} />}>
      {natillera.members.length === 0 ? (
        <Card tone="soft" title="Aún no hay socios">
          <AppText>Invite a su familia para empezar a ahorrar juntos.</AppText>
        </Card>
      ) : (
        natillera.members.map((member) => <MemberRow key={member.userId} member={member} />)
      )}
    </Screen>
  );
}
