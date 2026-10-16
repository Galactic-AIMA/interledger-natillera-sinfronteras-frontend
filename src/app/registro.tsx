import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { clearLog, formatLog, useDevLog, type LogEntry, type LogKind } from '@/api/devLog';
import { realMethods } from '@/api/hybridApi';
import { AppText, Button, Card, Screen } from '@/components';
import { BackButton } from '@/features/navegacion/BackButton';
import { fonts, palette, radius, space } from '@/theme';

// Registro técnico (para el equipo, se abre desde Su cuenta): llamadas a Cognito, al back, a la
// billetera pública y lo que todavía responde el modo de ejemplo. Vive en memoria: se borra al cerrar la app.
const KIND_LABEL: Record<LogKind, string> = { cognito: 'Cognito', api: 'Back', billetera: 'Billetera', demo: 'Ejemplo' };

function Row({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.at).toLocaleTimeString('es-CO', { hour12: false });
  const status = entry.status !== undefined ? ` · ${entry.status}` : '';
  const ms = entry.ms !== undefined ? ` · ${entry.ms} ms` : '';
  return (
    <View
      style={[styles.row, { borderLeftColor: entry.ok ? palette.money : palette.danger }]}
      accessible
      accessibilityLabel={`${time}, ${KIND_LABEL[entry.kind]}, ${entry.ok ? 'bien' : 'falló'}, ${entry.label}${entry.detail ? `, ${entry.detail}` : ''}`}
    >
      <AppText variant="caption" tone={entry.ok ? 'muted' : 'danger'}>
        {`${time} · ${KIND_LABEL[entry.kind]} · ${entry.ok ? 'OK' : 'FALLÓ'}${status}${ms}`}
      </AppText>
      <AppText variant="caption" style={styles.mono}>
        {entry.label}
      </AppText>
      {entry.detail ? (
        <AppText variant="caption" tone="danger">
          {entry.detail}
        </AppText>
      ) : null}
    </View>
  );
}

export default function ScreenRegistro() {
  const entries = useDevLog();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(formatLog(entries));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const footer = (
    <>
      <Button label={copied ? 'Copiado' : 'Copiar todo'} onPress={copy} disabled={entries.length === 0} />
      <Button label="Limpiar" variant="secondary" onPress={clearLog} disabled={entries.length === 0} />
    </>
  );

  return (
    <Screen headerLeft={<BackButton fallback={'/cuenta'} />} title="Registro técnico" footer={footer}>
      <Card tone="soft">
        <AppText variant="caption">
          Últimas llamadas de esta sesión, la más reciente arriba. No guarda contraseñas, tokens ni datos personales.
        </AppText>
        <AppText variant="caption" tone="muted">
          {`Van contra el back: ${[...realMethods].join(', ')}.`}
        </AppText>
      </Card>
      {entries.length === 0 ? (
        <AppText variant="body" tone="muted" align="center">
          Todavía no hay llamadas. Use la app y vuelva aquí.
        </AppText>
      ) : (
        entries.map((entry) => <Row key={entry.id} entry={entry} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    backgroundColor: palette.surface,
  },
  mono: { fontFamily: fonts.mono },
});
