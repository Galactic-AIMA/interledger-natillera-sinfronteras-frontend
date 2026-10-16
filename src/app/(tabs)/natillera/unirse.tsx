import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Screen, TextField } from '@/components';

// Formato esperado: letras, guion y números (ej. ROSA-4821).
const CODE_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

// 07 · Tengo una invitación — pide el código y lo manda a la pantalla 06.
export default function ScreenNatilleraUnirse() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError('Escriba el código que le dieron.');
      return;
    }
    if (!CODE_PATTERN.test(normalized)) {
      setError('El código solo lleva letras, números y un guion. Revíselo.');
      return;
    }
    setError(null);
    router.replace({ pathname: '/natillera', params: { code: normalized } });
  }

  return (
    <Screen title="Invitación" inTabs footer={<Button label="Unirme" onPress={submit} />}>
      <TextField
        label="Código de la invitación"
        placeholder="ROSA-4821"
        helper="Se lo dio quien creó la natillera."
        error={error}
        value={code}
        onChangeText={(text) => {
          setCode(text.toUpperCase());
          if (error) setError(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={submit}
        mono
      />
    </Screen>
  );
}
