import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useApi, useGoals } from '@/api';
import { isHybrid } from '@/api/hybridApi';
import { AppText, Button, Card, Screen } from '@/components';
import { GoalCard } from '@/features/metas/GoalCard';
import { BackButton } from '@/features/navegacion/BackButton';
import { palette, space } from '@/theme';

// 36 · Metas de la familia: ahorros con fecha y colectas (un viaje, un regalo, la cirugía de alguien).
export default function ScreenMetas() {
  const api = useApi();
  const { data: goals, isLoading, isError, refetch, isFetching } = useGoals();
  // Con sesión real las metas no van al servidor (no hay /goals): se dice para no prometer lo que no hay.
  const onlyOnPhone = api.mode === 'real' || isHybrid(api);

  const footer = <Button label="Nueva meta" onPress={() => router.push('/natillera/metas/nueva')} />;

  return (
    <Screen headerLeft={<BackButton />} title="Metas" inTabs footer={footer}>
      <AppText tone="muted">Ahorren juntos para algo puntual: un viaje, un regalo o ayudar a alguien de la familia.</AppText>
      {onlyOnPhone ? (
        <Card tone="soft" title="Por ahora, solo en este celular">
          <AppText>Las metas se guardan en este teléfono y se borran al cerrar la app. Los aportes a una colecta sí son pagos de verdad.</AppText>
        </Card>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} accessibilityLabel="Cargando las metas" />
        </View>
      ) : isError ? (
        <Card tone="danger" title="No pudimos cargar las metas">
          <AppText>Revise su conexión e inténtelo otra vez.</AppText>
          <Button label="Intentar de nuevo" variant="secondary" onPress={() => void refetch()} loading={isFetching} />
        </Card>
      ) : !goals || goals.length === 0 ? (
        <Card tone="soft" title="Todavía no hay metas">
          <AppText>Cree la primera: por ejemplo «Viaje en diciembre» o «Colecta para la abuela».</AppText>
        </Card>
      ) : (
        <View style={styles.list}>
          {goals.map((goal) => (
            <GoalCard key={goal.goalId} goal={goal} onPress={() => router.push({ pathname: '/natillera/metas/[goalId]', params: { goalId: goal.goalId } })} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', padding: space.xl },
  list: { gap: space.md },
});
