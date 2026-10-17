import { router } from 'expo-router';

import { AppText, BrandSymbol, Card, LinkRow, Screen } from '@/components';
import { AccountButton } from './AccountButton';

// 05 · Sin natillera — la persona aún no pertenece a ninguna.
export function NoNatillera() {
  return (
    <Screen title="Mi natillera" headerLeft={<BrandSymbol />} inTabs headerRight={<AccountButton />}>
      <Card title="Todavía no tiene natillera" tone="soft">
        <AppText variant="body">Un ahorro en familia: cada periodo todos ponen una cuota.</AppText>
      </Card>
      <LinkRow label="Crear una" onPress={() => router.push('/natillera/crear')} />
      <LinkRow label="Tengo una invitación" onPress={() => router.push('/natillera/unirse')} />
    </Screen>
  );
}
