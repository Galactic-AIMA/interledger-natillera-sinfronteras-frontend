import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { demoUsers, useApiContext, useMe } from '@/api';
import { isHybrid } from '@/api/hybridApi';
import { AppText, BrandLoader, Button, Card, Choice, InfoRow, Screen } from '@/components';
import { currencyName } from '@/utils/money';
import { BackButton } from '@/features/navegacion/BackButton';
import { setShowOverlay, useShowOverlay } from '@/features/registro/overlayPreference';
import { palette, space, touch } from '@/theme';

// 04 · Su cuenta
export default function ScreenCuenta() {
  const { api, logout, enterDemo } = useApiContext();
  const { data: me, isLoading, isError, refetch, isFetching } = useMe();
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const showOverlay = useShowOverlay();

  async function signOut() {
    setLeaving(true);
    setFailed(false);
    try {
      await logout();
      router.replace('/bienvenida');
    } catch {
      setFailed(true);
    } finally {
      setLeaving(false);
    }
  }

  const footer = (
    <>
      <Button label="Cerrar sesión" variant="danger" onPress={signOut} loading={leaving} />
      <Button label="Volver" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/natillera'))} />
    </>
  );

  return (
    <Screen headerLeft={<BackButton fallback={'/natillera'} />} title="Su cuenta" footer={footer}>
      {isLoading ? (
        <View style={{ alignItems: 'center', padding: 24 }}>
          <BrandLoader size={72} label="Cargando sus datos" />
        </View>
      ) : isError || !me ? (
        <Card tone="danger" title="No pudimos cargar sus datos">
          <AppText>Revise su conexión e inténtelo otra vez.</AppText>
          <Button label="Intentar de nuevo" variant="secondary" onPress={() => refetch()} loading={isFetching} />
        </Card>
      ) : (
        <Card title="Sus datos">
          <InfoRow label="Usuario" value={me.username} />
          <InfoRow label="Correo" value={me.email} />
          <InfoRow label="Celular" value={me.phone} />
          <InfoRow label="Billetera" value={`${me.walletAddress.replace(/^https?:\/\/[^/]+/, '…')} · ${currencyName(me.assetCode)}`} />
        </Card>
      )}

      {failed ? (
        <Card tone="danger">
          <AppText tone="danger">No pudimos cerrar la sesión. Inténtelo otra vez.</AppText>
        </Card>
      ) : null}

      {api.mode === 'demo' && !isHybrid(api) ? (
        <Card title="Entrar como…" tone="soft">
          <AppText variant="caption" tone="muted">
            Solo en el modo de ejemplo: pruebe la app como otra persona de la familia.
          </AppText>
          <Choice
            label="Persona"
            options={demoUsers.map((u) => ({ value: u.username, label: u.displayName }))}
            value={me?.username ?? ''}
            onChange={(username) => {
              // enterDemo vacía el caché; al volver a Mi natillera las pantallas piden los datos de la nueva persona.
              void enterDemo(username).then(() => router.replace('/natillera'));
            }}
          />
        </Card>
      ) : null}

      <Pressable
        onPress={() => setShowOverlay(!showOverlay)}
        style={styles.switchRow}
        accessibilityRole="switch"
        accessibilityState={{ checked: showOverlay }}
        accessibilityLabel="Mostrar el registro en pantalla"
        accessibilityHint="Para la presentación: un botón flotante con el registro en vivo"
      >
        <View style={styles.switchText}>
          <AppText>Mostrar el registro en pantalla</AppText>
          <AppText variant="caption" tone="muted">
            Para la presentación: un botón flotante con el registro en vivo
          </AppText>
        </View>
        <Switch
          value={showOverlay}
          onValueChange={setShowOverlay}
          trackColor={{ false: palette.borderSoft, true: palette.primary }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>

      <Button label="Registro técnico" variant="ghost" onPress={() => router.push('/registro')} accessibilityHint="Para el equipo: muestra las llamadas al servidor" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touch.buttonHeight, paddingVertical: space.sm },
  switchText: { flex: 1, gap: 2 },
});
