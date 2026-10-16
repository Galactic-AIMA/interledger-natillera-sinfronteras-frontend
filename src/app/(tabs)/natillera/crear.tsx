import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { ApiError, keys, useApi, type WalletInfo } from '@/api';
import { AppText, Button, Card, Screen, TextField } from '@/components';
import { WalletVerifier } from '@/features/natillera/WalletVerifier';
import { currencyName } from '@/utils/money';

// 08 · Crear una natillera
export default function ScreenNatilleraCrear() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [wallet, setWallet] = useState('');
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [errors, setErrors] = useState<{ name?: string; wallet?: string }>({});

  const create = useMutation({
    mutationFn: () => api.createNatillera({ natilleraName: name.trim(), walletAddress: wallet.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.natillera });
      router.replace('/natillera/invitacion');
    },
  });

  function submit() {
    const next: { name?: string; wallet?: string } = {};
    if (name.trim().length < 3) next.name = 'Escriba un nombre de al menos 3 letras.';
    if (!info) next.wallet = 'Verifique la billetera del fondo antes de continuar.';
    setErrors(next);
    if (Object.keys(next).length === 0) create.mutate();
  }

  const failure = create.error instanceof ApiError ? create.error.message : create.error ? 'No pudimos crear la natillera. Intente otra vez.' : null;

  return (
    <Screen title="Crear natillera" inTabs footer={<Button label="Crear la natillera" onPress={submit} loading={create.isPending} />}>
      <TextField label="Nombre de la natillera" value={name} onChangeText={(v) => { setName(v); setErrors((prev) => ({ ...prev, name: undefined })); }} error={errors.name} placeholder="Familia Rosa" autoCapitalize="words" />
      <WalletVerifier
        label="Dirección de la billetera del fondo"
        helper="La app no crea billeteras: debe existir."
        placeholder="https://…/natillera-rosa"
        value={wallet}
        onChange={(v) => { setWallet(v); setErrors((prev) => ({ ...prev, wallet: undefined })); }}
        onVerified={setInfo}
        error={errors.wallet}
        buttonLabel="Verificar la billetera"
      />
      {info?.assetCode ? (
        <Card title="La natillera ahorra en" tone="soft">
          <AppText variant="heading" tone="money">
            {currencyName(info.assetCode)}
          </AppText>
          <AppText variant="caption" tone="muted">
            La moneda la define la billetera del fondo.
          </AppText>
        </Card>
      ) : null}
      {failure ? (
        <AppText variant="body" tone="danger" accessibilityLiveRegion="polite">
          {failure}
        </AppText>
      ) : null}
    </Screen>
  );
}
