import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Screen, TextField } from '@/components';
import { BackButton } from '@/features/navegacion/BackButton';

// Formato esperado: letras, números y guiones (ej. FAMILIA-Z9BR-J4TX; los viejos, ROSA-4821).
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
      setError('El código solo lleva letras, números y guiones. Revíselo.');
      return;
    }
    setError(null);
    router.replace({ pathname: '/natillera', params: { code: normalized } });
  }

  return (
    <Screen headerLeft={<BackButton />} title="Invitación" inTabs footer={<Button label="Buscar invitación" onPress={submit} />}>
      <TextField
        label="Código de la invitación"
        placeholder="Escriba el código"
        helper="Se lo dio quien creó la natillera. Ej.: FAMILIA-Z9BR-J4TX"
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
