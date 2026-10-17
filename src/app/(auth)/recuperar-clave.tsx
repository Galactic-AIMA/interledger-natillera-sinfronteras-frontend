import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components';
import { FadeIn } from '@/features/auth/FadeIn';
import { BackButton } from '@/features/navegacion/BackButton';
import { space } from '@/theme';

// Recuperar contraseña: SOLO DEMOSTRACIÓN (decisión de Camilo, 2026-10-17). No llama a Cognito ni cambia
// la clave. La versión real sería ForgotPassword + ConfirmForgotPassword en src/api/auth.ts, pero el
// pre-signup del back no verifica el correo y Cognito no tendría a dónde mandar el código.

type Step = 'pedir' | 'codigo' | 'listo';

const DEMO_DELAY_MS = 900;

// Misma regla que la política de Cognito del registro.
function passwordProblem(value: string): string | null {
  if (value.length < 8) return 'Use mínimo 8 caracteres.';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) return 'Use mayúsculas y minúsculas.';
  if (!/\d/.test(value)) return 'Agregue al menos un número.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Agregue al menos un símbolo, por ejemplo ! o #.';
  return null;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export default function RecuperarClave() {
  const [step, setStep] = useState<Step>('pedir');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (loading) return;
    const nextUserError = username.trim() ? null : 'Escriba su usuario.';
    setUserError(nextUserError);
    if (nextUserError) return;
    setLoading(true);
    await wait(DEMO_DELAY_MS);
    setLoading(false);
    setStep('codigo');
  }

  async function changePassword() {
    if (loading) return;
    const nextCodeError = /^\d{6}$/.test(code.trim()) ? null : 'El código tiene 6 números.';
    const nextPassError = passwordProblem(password);
    const nextConfirmError = !nextPassError && confirm !== password ? 'Las dos contraseñas no son iguales.' : null;
    setCodeError(nextCodeError);
    setPassError(nextPassError);
    setConfirmError(nextConfirmError);
    if (nextCodeError || nextPassError || nextConfirmError) return;
    setLoading(true);
    await wait(DEMO_DELAY_MS);
    setLoading(false);
    setStep('listo');
  }

  if (step === 'listo') {
    return (
      <Screen title="Contraseña cambiada" footer={<Button label="Entrar" onPress={() => router.replace('/entrar')} />}>
        <FadeIn>
          <View style={styles.form}>
            <AppText variant="body">Listo. Ya puede entrar con su contraseña nueva.</AppText>
          </View>
        </FadeIn>
      </Screen>
    );
  }

  if (step === 'codigo') {
    return (
      <Screen
        headerLeft={<BackButton fallback={'/entrar'} />}
        title="Escriba el código"
        footer={<Button label="Cambiar contraseña" onPress={changePassword} loading={loading} />}
      >
        <FadeIn>
          <View style={styles.form}>
            <AppText variant="body">Le enviamos un código de 6 números al correo de su cuenta.</AppText>
            <TextField
              label="Código"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              error={codeError}
              helper="Demostración: sirve cualquier código de 6 números."
              mono
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
            />
            <TextField
              label="Contraseña nueva"
              value={password}
              onChangeText={setPassword}
              error={passError}
              helper="Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo."
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <TextField
              label="Repita la contraseña nueva"
              value={confirm}
              onChangeText={setConfirm}
              error={confirmError}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={changePassword}
            />
            <Button label="No me llegó el código" variant="ghost" onPress={() => setStep('pedir')} />
          </View>
        </FadeIn>
      </Screen>
    );
  }

  return (
    <Screen
      headerLeft={<BackButton fallback={'/entrar'} />}
      title="Recuperar contraseña"
      footer={<Button label="Enviar código" onPress={sendCode} loading={loading} />}
    >
      <FadeIn>
        <View style={styles.form}>
          <AppText variant="body">Escriba su usuario y le enviaremos un código a su correo para crear una contraseña nueva.</AppText>
          <TextField
            label="Usuario"
            value={username}
            onChangeText={setUsername}
            error={userError}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="go"
            onSubmitEditing={sendCode}
          />
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
});
