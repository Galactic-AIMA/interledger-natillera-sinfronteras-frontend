import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, useApiContext } from '@/api';
import { AppText, Button, Screen, TextField } from '@/components';
import { FadeIn } from '@/features/auth/FadeIn';
import { space } from '@/theme';
import { BackButton } from '@/features/navegacion/BackButton';

// 03 · Entrar. En modo demo sirven rosa.gomez, luz y andres con cualquier contraseña.
export default function Entrar() {
  const { login } = useApiContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    const nextUserError = username.trim() ? null : 'Escriba su usuario.';
    const nextPassError = password ? null : 'Escriba su contraseña.';
    setUserError(nextUserError);
    setPassError(nextPassError);
    setFormError(null);
    if (nextUserError || nextPassError) return;

    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/natillera');
    } catch (e) {
      // Cognito responde los errores de login con 400 (NotAuthorizedException), no 401: se muestra el
      // mensaje ya traducido de auth.ts y solo se habla de internet cuando de verdad no hubo conexión.
      if (e instanceof ApiError && e.code === 'network') setFormError('No pudimos conectarnos. Revise su internet e intente de nuevo.');
      else if (e instanceof ApiError) setFormError(e.status === 401 ? 'Su usuario o su contraseña no son correctos. Revíselos e intente de nuevo.' : e.message);
      else setFormError('No pudimos entrar. Intente de nuevo.');
      if (__DEV__) console.warn('[login]', e instanceof ApiError ? `${e.status} ${e.code}` : e);
      setLoading(false);
    }
  }

  return (
    <Screen headerLeft={<BackButton fallback={'/bienvenida'} />} title="Entrar" footer={<Button label="Entrar" onPress={submit} loading={loading} />}>
      <FadeIn>
        <View style={styles.form}>
          <TextField
            label="Usuario"
            value={username}
            onChangeText={setUsername}
            error={userError}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
          />
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            error={passError}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {formError ? (
            <AppText variant="body" tone="danger" accessibilityLiveRegion="polite">
              {formError}
            </AppText>
          ) : null}
          <Button label="Todavía no tengo cuenta" variant="ghost" onPress={() => router.replace('/crear-cuenta')} />
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
});
