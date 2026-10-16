import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { ApiError, useApi, useApiContext, type WalletInfo } from '@/api';
import { AppText, Button, Screen, TextField } from '@/components';
import { WalletVerifier } from '@/features/natillera/WalletVerifier';

type Errors = Partial<Record<'username' | 'password' | 'email' | 'phone' | 'wallet', string>>;

// 02 · Crear mi cuenta
export default function ScreenCrearCuenta() {
  const api = useApi();
  const { login } = useApiContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [wallet, setWallet] = useState('');
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const signup = useMutation({
    mutationFn: async () => {
      await api.signup({ username: username.trim(), password, email: email.trim(), phone: phone.trim(), walletAddress: wallet.trim() });
      try {
        await login(username.trim(), password);
        return 'logged' as const;
      } catch {
        // La cuenta quedó creada: si no se pudo entrar sola, se lleva a "Entrar".
        return 'enter' as const;
      }
    },
    onSuccess: (next) => router.replace(next === 'logged' ? '/' : '/entrar'),
  });

  // Al escribir en un campo se limpia su error.
  function field(key: keyof Errors, set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };
  }

  function submit() {
    const next: Errors = {};
    if (username.trim().length < 3) next.username = 'Escriba un usuario de al menos 3 letras.';
    if (password.length < 8) next.password = 'La contraseña necesita al menos 8 caracteres.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Escriba un correo válido, como rosa@correo.com.';
    if (phone.replace(/\D/g, '').length < 7) next.phone = 'Escriba su celular con el indicativo del país.';
    if (!wallet.trim()) next.wallet = 'Escriba la dirección de su billetera.';
    else if (!info) next.wallet = 'Todavía no verificamos la billetera. Toque fuera del campo y espere el aviso.';
    setErrors(next);
    if (Object.keys(next).length === 0) signup.mutate();
  }

  const failure = signup.error instanceof ApiError ? signup.error.message : signup.error ? 'No pudimos crear la cuenta. Intente otra vez.' : null;

  return (
    <Screen title="Crear mi cuenta" footer={<Button label="Crear mi cuenta" onPress={submit} loading={signup.isPending} />}>
      <TextField label="Usuario" value={username} onChangeText={field('username', setUsername)} error={errors.username} autoCapitalize="none" autoCorrect={false} textContentType="username" />
      <TextField label="Contraseña" value={password} onChangeText={field('password', setPassword)} error={errors.password} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
      <TextField label="Correo" value={email} onChangeText={field('email', setEmail)} error={errors.email} placeholder="rosa@correo.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
      <TextField label="Celular" value={phone} onChangeText={field('phone', setPhone)} error={errors.phone} placeholder="+57 300 555 0101" keyboardType="phone-pad" textContentType="telephoneNumber" />
      <WalletVerifier
        label="Dirección de su billetera"
        helper="Verificamos que la billetera exista."
        placeholder="https://…/rosa"
        value={wallet}
        onChange={field('wallet', setWallet)}
        onVerified={setInfo}
        error={errors.wallet}
        currencyLead="Su billetera recibe en"
        buttonLabel="Verificar la billetera"
      />
      {failure ? (
        <AppText variant="body" tone="danger" accessibilityLiveRegion="polite">
          {failure}
        </AppText>
      ) : null}
    </Screen>
  );
}
