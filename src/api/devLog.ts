import { useSyncExternalStore } from 'react';

// Registro técnico en memoria (pantalla "Registro técnico", desde Su cuenta). Solo metadatos de cada
// llamada: nunca cuerpos, contraseñas, tokens ni la query string (puede traer datos de la persona).

export type LogKind = 'cognito' | 'api' | 'billetera' | 'demo';

export type LogEntry = {
  id: number;
  at: number;
  kind: LogKind;
  label: string;
  ok: boolean;
  status?: number;
  ms?: number;
  detail?: string;
};

const MAX_ENTRIES = 200;
let entries: readonly LogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

// API Gateway responde a una ruta no desplegada con un error SigV4 que trae un hash del header
// Authorization: se cambia por un texto claro y nunca se guarda nada derivado del token.
function safeDetail(detail: string | undefined): string | undefined {
  if (!detail) return detail;
  if (/authorization|signature|sigv4|credential/i.test(detail)) return 'Ruta no desplegada en el API (API Gateway pidió firma)';
  return detail.length > 200 ? `${detail.slice(0, 200)}…` : detail;
}

export function logEvent(entry: Omit<LogEntry, 'id' | 'at'>) {
  entries = [{ ...entry, detail: safeDetail(entry.detail), id: nextId++, at: Date.now() }, ...entries].slice(0, MAX_ENTRIES);
  emit();
}

export function clearLog() {
  entries = [];
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => entries;

/** Entradas más recientes primero; se actualiza sola. */
export function useDevLog(): readonly LogEntry[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Quita la query string y el host: deja solo la ruta. */
export function pathOnly(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/i, '').split('?')[0] || '/';
}

/** Texto plano para copiar y pegarle al equipo. */
export function formatLog(list: readonly LogEntry[]): string {
  return list
    .map((e) => {
      const time = new Date(e.at).toLocaleTimeString('es-CO', { hour12: false });
      const status = e.status !== undefined ? ` ${e.status}` : '';
      const ms = e.ms !== undefined ? ` ${e.ms} ms` : '';
      return `${time} [${e.kind}] ${e.ok ? 'OK' : 'FALLÓ'}${status} ${e.label}${ms}${e.detail ? ` · ${e.detail}` : ''}`;
    })
    .join('\n');
}
