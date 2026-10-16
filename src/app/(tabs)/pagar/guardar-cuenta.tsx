import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError, keys, useApi, type WalletInfo } from '@/api';
import { AppText, Button, Card, Screen, TextField } from '@/components';
import { palette, space, touch } from '@/theme';
import { currencyName } from '@/utils/money';

function BackButton() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} hitSlop={8} style={styles.back}>
      <Ionicons name="chevron-back" size={28} color={palette.text} />
    </Pressable>
  );
}

// 27 · Guardar cuenta: verifica la billetera y le pone un nombre para reconocerla.
export default function ScreenPagarGuardarCuenta() {
  const api = useApi();
  const queryClient = useQueryClient();

  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [verified, setVerified] = useState<WalletInfo | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function onAddressChange(text: string) {
    setAddress(text);
    // Si cambia la dirección, la verificación anterior ya no vale.
    setVerified(null);
    setVerifyError(null);
  }

  async function verify() {
    const trimmed = address.trim();
    if (!trimmed) {
      setVerifyError('Escriba la dirección de la billetera.');
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    try {
      const info = await api.verifyWallet(trimmed);
      if (info.exists) setVerified(info);
      else setVerifyError('No encontramos esa billetera. Revise la dirección.');
    } catch (e) {
      setVerifyError(e instanceof ApiError ? e.message : 'No pudimos verificar la billetera. Intente de nuevo.');
    } finally {
      setVerifying(false);
    }
  }

  async function save() {
    if (!verified) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.saveAccount(address.trim(), name.trim());
      await queryClient.invalidateQueries({ queryKey: keys.accounts });
      // Vuelve a 26 con el nombre guardado para que quede preseleccionada.
      router.navigate({ pathname: '/pagar', params: { saved: name.trim() } });
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'No pudimos guardar la cuenta. Intente de nuevo.');
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
      <Button label="Guardar la cuenta" onPress={() => void save()} loading={saving} disabled={!verified || name.trim().length === 0} />
    </>
  );

  return (
    <Screen title="Guardar cuenta" inTabs headerLeft={<BackButton />} footer={footer}>
      <Card title="1. Dirección de la billetera">
        <TextField
          label="Dirección"
          value={address}
          onChangeText={onAddressChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://…/luz"
          mono
          error={verifyError}
        />
        <Button label="Verificar la billetera" variant="secondary" onPress={() => void verify()} loading={verifying} disabled={address.trim().length === 0} />
        {verified ? (
          <View style={styles.found} accessibilityLiveRegion="polite">
            <AppText variant="bodyStrong" tone="money">
              ✓ Billetera encontrada
            </AppText>
            {verified.assetCode ? <AppText tone="muted">Recibe en {currencyName(verified.assetCode)}</AppText> : null}
          </View>
        ) : null}
      </Card>

      <Card title="2. Nombre para reconocerla">
        <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Luz, mi hija" helper="Así la verá en su lista de cuentas." />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { minWidth: touch.minHeight, minHeight: touch.minHeight, alignItems: 'center', justifyContent: 'center' },
  found: { gap: space.xs },
});
