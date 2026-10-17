import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clearLog, useDevLog, type LogEntry, type LogKind } from '@/api/devLog';
import { fonts, palette, radius, space } from '@/theme';

// Botón flotante "Logs" encima de todas las pantallas: abre un panel en vivo con el registro técnico
// para proyectarlo en el pitch mientras se usa la app. Mismos datos que /registro (sin secretos).
const KIND_LABEL: Record<LogKind, string> = { cognito: 'Cognito', api: 'Back', billetera: 'Billetera', demo: 'Ejemplo' };
const CONSOLE_BG = 'rgba(10, 14, 26, 0.94)';
const CONSOLE_TEXT = '#E6E9F2';
const OK_COLOR = '#5FD3A0';
const FAIL_COLOR = '#FF7A66';

function Line({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.at).toLocaleTimeString('es-CO', { hour12: false });
  const status = entry.status !== undefined ? ` ${entry.status}` : '';
  const ms = entry.ms !== undefined ? ` · ${entry.ms} ms` : '';
  return (
    <View style={styles.line}>
      <Text style={[styles.mono, { color: entry.ok ? OK_COLOR : FAIL_COLOR }]}>
        {`${time} [${KIND_LABEL[entry.kind]}] ${entry.ok ? 'OK' : 'FALLÓ'}${status}${ms}`}
      </Text>
      <Text style={[styles.mono, styles.label]}>{entry.label}</Text>
      {entry.detail ? <Text style={[styles.mono, { color: FAIL_COLOR }]}>{entry.detail}</Text> : null}
    </View>
  );
}

export function DevLogOverlay() {
  const entries = useDevLog();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const failures = entries.filter((e) => !e.ok).length;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open ? (
        <View style={[styles.panel, { paddingBottom: insets.bottom + space.sm }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.mono, styles.title]}>{`Registro en vivo · ${entries.length}`}</Text>
            <Pressable onPress={clearLog} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpiar registro">
              <Text style={[styles.mono, styles.action]}>Limpiar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {entries.length === 0 ? (
              <Text style={[styles.mono, styles.label]}>Sin llamadas todavía. Use la app.</Text>
            ) : (
              entries.map((entry) => <Line key={entry.id} entry={entry} />)
            )}
          </ScrollView>
        </View>
      ) : null}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.fab, { top: insets.top + 64 }]}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Cerrar registro técnico' : 'Abrir registro técnico'}
      >
        <Text style={[styles.mono, styles.fabText]}>{open ? '✕ Logs' : `Logs ${entries.length}`}</Text>
        {!open && failures > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 17, color: CONSOLE_TEXT },
  fab: {
    position: 'absolute',
    right: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: CONSOLE_BG,
    opacity: 0.85,
  },
  fabText: { fontFamily: fonts.monoBold },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: FAIL_COLOR },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: CONSOLE_BG,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.md,
    paddingHorizontal: space.md,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  title: { fontFamily: fonts.monoBold, fontSize: 14 },
  action: { color: palette.surfaceSoft, textDecorationLine: 'underline' },
  list: { gap: space.sm, paddingBottom: space.lg },
  line: { borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.15)', paddingLeft: space.sm },
  label: { color: CONSOLE_TEXT },
});
