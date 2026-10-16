import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { ApiError, keys, useApi, useMyNatillera, type GoalMode, type WalletInfo } from '@/api';
import { AppText, Button, Card, Choice, Screen, TextField } from '@/components';
import { deadlineOptions } from '@/features/metas/goalMath';
import { WalletVerifier } from '@/features/natillera/WalletVerifier';
import { BackButton } from '@/features/navegacion/BackButton';
import { currencyName, toMinorUnits } from '@/utils/money';

const MODES = [
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'colecta', label: 'Colecta' },
] as const;

// 37 · Nueva meta. Ahorro: se aparta plata del fondo. Colecta: cada quien aporta directo a la billetera de alguien.
export default function ScreenNuevaMeta() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { data: natillera } = useMyNatillera();
  const deadlines = useMemo(() => deadlineOptions(), []);

  const [mode, setMode] = useState<GoalMode>('ahorro');
  const [name, setName] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [deadline, setDeadline] = useState(deadlines[1]?.value ?? '');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [wallet, setWallet] = useState('');
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Ahorro: en la moneda del fondo. Colecta: en la moneda de la billetera de quien recibe.
  const asset =
    mode === 'colecta'
      ? { assetCode: walletInfo?.assetCode ?? 'COP', assetScale: walletInfo?.assetScale ?? 2 }
      : (natillera?.asset ?? { assetCode: 'COP', assetScale: 2 });
  const minor = toMinorUnits(targetInput, asset.assetScale, asset.assetCode);

  const errors = {
    name: touched && !name.trim() ? 'Escriba para qué es la meta.' : null,
    target: touched && !minor ? 'Escriba cuánto quieren reunir.' : null,
    beneficiary: touched && mode === 'colecta' && !beneficiaryName.trim() ? 'Escriba a quién le llega la plata.' : null,
    wallet: touched && mode === 'colecta' && !walletInfo?.exists ? 'Verifique la billetera de quien recibe.' : null,
  };

  async function save() {
    setTouched(true);
    const colectaOk = mode === 'ahorro' || (beneficiaryName.trim() && walletInfo?.exists);
    if (!name.trim() || !minor || !colectaOk) return;
    setSaving(true);
    setSaveError(null);
    try {
      const goal = await api.createGoal({
        mode,
        name,
        target: { value: minor, ...asset },
        deadline,
        beneficiaryName: mode === 'colecta' ? beneficiaryName : undefined,
        beneficiaryWallet: mode === 'colecta' ? walletInfo?.walletAddress : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: keys.goals });
      router.replace({ pathname: '/natillera/metas/[goalId]', params: { goalId: goal.goalId } });
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'No pudimos crear la meta. Intente de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      {saveError ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {saveError}
        </AppText>
      ) : null}
      <Button label="Crear la meta" onPress={() => void save()} loading={saving} />
    </>
  );

  return (
    <Screen headerLeft={<BackButton fallback="/natillera/metas" />} title="Nueva meta" inTabs footer={footer}>
      <Card title="1. ¿Qué tipo de meta?">
        <Choice options={MODES} value={mode} onChange={setMode} label="Tipo de meta" />
        <AppText variant="caption" tone="muted">
          {mode === 'ahorro'
            ? 'Ahorro: apartan plata del fondo de la natillera hasta llegar al monto. Ej.: el viaje de diciembre.'
            : 'Colecta: cada quien aporta desde su billetera, en su moneda, y la plata le llega directo a quien la necesita.'}
        </AppText>
      </Card>

      <Card title="2. ¿Para qué es?">
        <TextField
          label="Nombre de la meta"
          value={name}
          onChangeText={setName}
          placeholder={mode === 'ahorro' ? 'Viaje a Cartagena' : 'Cirugía de la abuela'}
          error={errors.name}
        />
      </Card>

      {mode === 'colecta' ? (
        <Card title="3. ¿A quién le llega?">
          <TextField label="Nombre" value={beneficiaryName} onChangeText={setBeneficiaryName} placeholder="Abuela Carmen" error={errors.beneficiary} />
          <WalletVerifier
            label="Billetera de quien recibe"
            placeholder="https://ilp.interledger-test.dev/…"
            value={wallet}
            onChange={setWallet}
            onVerified={setWalletInfo}
            buttonLabel="Verificar billetera"
            error={errors.wallet}
          />
        </Card>
      ) : null}

      <Card title={mode === 'colecta' ? '4. ¿Cuánto y para cuándo?' : '3. ¿Cuánto y para cuándo?'}>
        <TextField
          label={`Monto en ${currencyName(asset.assetCode)}`}
          value={targetInput}
          onChangeText={setTargetInput}
          keyboardType="numeric"
          placeholder="$ 3.000.000"
          mono
          error={errors.target}
        />
        <Choice options={deadlines} value={deadline} onChange={setDeadline} label="¿Para cuándo?" />
      </Card>
    </Screen>
  );
}
