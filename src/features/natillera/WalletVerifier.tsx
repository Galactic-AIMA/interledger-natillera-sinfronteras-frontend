import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, useApi, type WalletInfo } from '@/api';
import { AppText, Button, TextField } from '@/components';
import { palette, space } from '@/theme';
import { currencyName } from '@/utils/money';

type Status = 'idle' | 'loading' | 'found' | 'missing' | 'error';

type WalletVerifierProps = {
  label: string;
  helper?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  // Se avisa con la info de la billetera al verificarla, y con null cuando se edita el campo.
  onVerified: (info: WalletInfo | null) => void;
  // Error de validación del formulario (p. ej. "falta la billetera").
  error?: string | null;
  // Texto del botón; si no se da, no hay botón y se verifica al salir del campo.
  buttonLabel?: string;
  // Texto tras encontrarla, antes de la moneda.
  currencyLead?: string;
};

/** Campo de billetera con verificación contra el back: muestra "Billetera encontrada" y su moneda. */
export function WalletVerifier({ label, helper, placeholder, value, onChange, onVerified, error, buttonLabel, currencyLead = 'Recibe en' }: WalletVerifierProps) {
  const api = useApi();
  const [status, setStatus] = useState<Status>('idle');
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function edit(text: string) {
    onChange(text);
    if (status !== 'idle') {
      setStatus('idle');
      setInfo(null);
      setMessage(null);
      onVerified(null);
    }
  }

  async function verify() {
    const address = value.trim();
    if (!address) {
      setStatus('missing');
      setMessage('Escriba la dirección de la billetera.');
      return;
    }
    setStatus('loading');
    setMessage(null);
    try {
      const result = await api.verifyWallet(address);
      if (result.exists) {
        setInfo(result);
        setStatus('found');
        onVerified(result);
      } else {
        setStatus('missing');
        setMessage('No encontramos esa billetera. Revise la dirección.');
        onVerified(null);
      }
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof ApiError ? e.message : 'No pudimos verificarla. Intente otra vez.');
      onVerified(null);
    }
  }

  return (
    <View style={styles.wrapper}>
      <TextField
        label={label}
        helper={helper}
        placeholder={placeholder}
        value={value}
        onChangeText={edit}
        error={status === 'found' ? null : (error ?? (status === 'missing' || status === 'error' ? message : null))}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        textContentType="URL"
        onBlur={() => {
          if (status === 'idle' && value.trim() && !buttonLabel) void verify();
        }}
      />
      {buttonLabel ? <Button label={buttonLabel} variant="secondary" onPress={verify} loading={status === 'loading'} /> : null}
      {!buttonLabel && status === 'loading' ? (
        <AppText variant="caption" tone="muted">
          Verificando la billetera…
        </AppText>
      ) : null}
      {status === 'found' && info ? (
        <View style={styles.found} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong" tone="money">
            ✓ Billetera encontrada
          </AppText>
          {info.assetCode ? (
            <AppText variant="body">
              {currencyLead} {currencyName(info.assetCode)}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  found: { backgroundColor: palette.surfaceSoft, borderRadius: 12, padding: space.md, gap: 2 },
});
