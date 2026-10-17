import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clearLog, formatLog, useDevLog, type LogEntry, type LogKind } from '@/api/devLog';
import { fonts, palette, radius, space } from '@/theme';

// Botón flotante "Logs" encima de todas las pantallas: abre un panel en vivo con el registro técnico
// para proyectarlo en el pitch mientras se usa la app. Mismos datos que /registro (sin secretos).
// Navegable: filtros por tipo y por fallas, filas compactas que se abren con un toque, panel que se
// agranda y un botón para copiar todo el registro de una vez.
const KIND_LABEL: Record<LogKind, string> = { cognito: 'Cognito', api: 'Back', billetera: 'Billetera', demo: 'Ejemplo' };
const KINDS = ['api', 'cognito', 'billetera', 'demo'] as const satisfies readonly LogKind[];
type Filter = 'todos' | 'fallas' | LogKind;

const CONSOLE_BG = 'rgba(10, 14, 26, 0.96)';
const CONSOLE_TEXT = '#E6E9F2';
const CONSOLE_MUTED = '#9AA3B8';
const CHIP_BG = 'rgba(255, 255, 255, 0.08)';
const CHIP_ON_BG = '#E6E9F2';
const OK_COLOR = '#5FD3A0';
const FAIL_COLOR = '#FF7A66';
const COPIED_MS = 1800;

function matches(entry: LogEntry, filter: Filter): boolean {
  if (filter === 'todos') return true;
  if (filter === 'fallas') return !entry.ok;
  return entry.kind === filter;
}

function Chip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}: ${count}`}
      hitSlop={4}
    >
      <Text style={[styles.mono, styles.chipText, active && styles.chipTextOn]}>{`${label} ${count}`}</Text>
    </Pressable>
  );
}

function Line({ entry, expanded, onToggle }: { entry: LogEntry; expanded: boolean; onToggle: () => void }) {
  const time = new Date(entry.at).toLocaleTimeString('es-CO', { hour12: false });
  const color = entry.ok ? OK_COLOR : FAIL_COLOR;
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.line, { borderLeftColor: color }]}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${KIND_LABEL[entry.kind]} ${entry.ok ? 'OK' : 'falló'} ${entry.label}`}
    >
      <View style={styles.lineTop}>
        <Text style={[styles.mono, styles.muted]}>{time}</Text>
        <Text style={[styles.mono, styles.kind]}>{KIND_LABEL[entry.kind]}</Text>
        <Text style={[styles.mono, { color }]}>{entry.ok ? 'OK' : 'FALLÓ'}{entry.status !== undefined ? ` ${entry.status}` : ''}</Text>
        {entry.ms !== undefined ? <Text style={[styles.mono, styles.muted, styles.ms]}>{`${entry.ms} ms`}</Text> : null}
      </View>
      <Text style={styles.mono} numberOfLines={expanded ? undefined : 1}>
        {entry.label}
      </Text>
      {entry.detail ? (
        <Text style={[styles.mono, { color: FAIL_COLOR }]} numberOfLines={expanded ? undefined : 1}>
          {entry.detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

function HeaderButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.headerButton} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={CONSOLE_TEXT} />
    </Pressable>
  );
}

export function DevLogOverlay() {
  const entries = useDevLog();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [tall, setTall] = useState(false);
  const [filter, setFilter] = useState<Filter>('todos');
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const failures = entries.filter((e) => !e.ok).length;
  const visible = useMemo(() => entries.filter((e) => matches(e, filter)), [entries, filter]);
  const chips = useMemo(
    () =>
      [
        { key: 'todos' as const, label: 'Todos', count: entries.length },
        { key: 'fallas' as const, label: 'Fallas', count: failures },
        ...KINDS.map((kind) => ({ key: kind, label: KIND_LABEL[kind], count: entries.filter((e) => e.kind === kind).length })),
      ].filter((chip) => chip.key === 'todos' || chip.count > 0 || chip.key === filter),
    [entries, failures, filter],
  );

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  // Copia todo el registro (no solo lo filtrado), del más viejo al más nuevo: así se lee como una historia.
  async function copyAll() {
    await Clipboard.setStringAsync(formatLog([...entries].reverse()));
    setCopied(true);
  }

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open ? (
        <View style={[styles.panel, { height: tall ? '88%' : '55%', paddingBottom: insets.bottom + space.sm }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.mono, styles.title]}>{`Registro · ${entries.length}`}</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => void copyAll()}
                disabled={entries.length === 0}
                hitSlop={8}
                style={[styles.copyButton, entries.length === 0 && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Copiar todo el registro"
              >
                <Ionicons name={copied ? 'checkmark' : 'clipboard-outline'} size={18} color={copied ? OK_COLOR : CONSOLE_TEXT} />
                <Text style={[styles.mono, styles.copyText, copied && { color: OK_COLOR }]}>{copied ? 'Copiado' : 'Copiar todo'}</Text>
              </Pressable>
              <HeaderButton icon={tall ? 'chevron-down' : 'chevron-up'} label={tall ? 'Achicar el panel' : 'Agrandar el panel'} onPress={() => setTall((v) => !v)} />
              <HeaderButton icon="trash-outline" label="Limpiar registro" onPress={() => { clearLog(); setExpanded(new Set()); }} />
            </View>
          </View>
          <View style={styles.chips}>
            {chips.map((chip) => (
              <Chip key={chip.key} label={chip.label} count={chip.count} active={filter === chip.key} onPress={() => setFilter(chip.key)} />
            ))}
          </View>
          <FlatList
            data={visible}
            keyExtractor={(entry) => String(entry.id)}
            renderItem={({ item }) => <Line entry={item} expanded={expanded.has(item.id)} onToggle={() => toggle(item.id)} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={[styles.mono, styles.muted]}>{entries.length === 0 ? 'Sin llamadas todavía. Use la app.' : 'Nada con este filtro.'}</Text>
            }
          />
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
  muted: { color: CONSOLE_MUTED },
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
    backgroundColor: CONSOLE_BG,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.md,
    paddingHorizontal: space.md,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm, gap: space.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 40,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: CHIP_BG,
  },
  copyText: { fontFamily: fonts.monoBold },
  disabled: { opacity: 0.4 },
  title: { fontFamily: fonts.monoBold, fontSize: 14, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.sm },
  chip: { paddingHorizontal: space.sm, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: CHIP_BG },
  chipOn: { backgroundColor: CHIP_ON_BG },
  chipText: { color: CONSOLE_TEXT },
  chipTextOn: { color: palette.text, fontFamily: fonts.monoBold },
  list: { gap: space.xs, paddingBottom: space.lg },
  line: { borderLeftWidth: 3, paddingLeft: space.sm, paddingVertical: 4 },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  kind: { fontFamily: fonts.monoBold },
  ms: { marginLeft: 'auto' },
});
