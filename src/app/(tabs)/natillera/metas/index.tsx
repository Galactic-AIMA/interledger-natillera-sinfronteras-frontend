import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useGoals } from '@/api';
import { AppText, Button, Card, Screen } from '@/components';
import { GoalCard } from '@/features/metas/GoalCard';
import { BackButton } from '@/features/navegacion/BackButton';
import { palette, space } from '@/theme';

// 36 · Metas de la familia: ahorros con fecha y colectas (un viaje, un regalo, la cirugía de alguien).
export default function ScreenMetas() {
  const { data: goals, isLoading, isError, refetch, isFetching } = useGoals();

  const footer = <Button label="Nueva meta" onPress={() => router.push('/natillera/metas/nueva')} />;

  return (
    <Screen headerLeft={<BackButton />} title="Metas" inTabs footer={footer}>
      <AppText tone="muted">Ahorren juntos para algo puntual: un viaje, un regalo o ayudar a alguien de la familia.</AppText>

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
