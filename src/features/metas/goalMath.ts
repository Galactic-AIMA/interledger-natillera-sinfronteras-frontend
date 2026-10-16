import type { Amount, Goal } from '@/api/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días que faltan hasta la fecha límite (0 si ya pasó). */
export function daysLeft(deadline: string, today = new Date()): number {
  const [y, m, d] = deadline.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const end = new Date(y, m - 1, d).getTime();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

export function daysLeftLabel(deadline: string): string {
  const days = daysLeft(deadline);
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Falta 1 día';
  return `Faltan ${days} días`;
}

/** Fecha en palabras: "15 de noviembre". */
export function deadlineLabel(deadline: string): string {
  const [y, m, d] = deadline.split('-').map(Number);
  if (!y || !m || !d) return deadline;
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

/** Solo para dibujar la barra: proporción 0..1. La lógica de plata va en BigInt. */
export function progress(goal: Goal): number {
  const target = Number(goal.target.value);
  if (!(target > 0)) return 0;
  return Math.min(1, Number(goal.raised.value) / target);
}

export function remaining(goal: Goal): Amount {
  const left = BigInt(goal.target.value) - BigInt(goal.raised.value);
  return { ...goal.target, value: String(left > 0n ? left : 0n) };
}

export function isReached(goal: Goal): boolean {
  return BigInt(goal.raised.value) >= BigInt(goal.target.value);
}

// División hacia arriba en la unidad entera de la moneda (pesos sin centavos).
function ceilTo(value: bigint, divisor: bigint, assetScale: number): bigint {
  const unit = 10n ** BigInt(assetScale);
  const raw = (value + divisor - 1n) / divisor;
  return ((raw + unit - 1n) / unit) * unit;
}

/**
 * "¿Cuánto me toca?": lo que falta repartido entre los socios. En una colecta es un solo aporte;
 * en un ahorro se reparte además por los meses que quedan hasta la fecha.
 */
export function sharePerPerson(goal: Goal, members: number): { amount: Amount; periods: number } {
  const left = BigInt(remaining(goal).value);
  const people = BigInt(Math.max(members, 1));
  const periods = goal.mode === 'ahorro' ? Math.max(1, Math.ceil(daysLeft(goal.deadline) / 30)) : 1;
  const value = left === 0n ? 0n : ceilTo(left, people * BigInt(periods), goal.target.assetScale);
  return { amount: { ...goal.target, value: String(value) }, periods };
}

/** Fechas límite que se ofrecen al crear la meta (sin calendario: más fácil para adultos mayores). */
export function deadlineOptions(today = new Date()) {
  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const plusMonths = (n: number) => new Date(today.getFullYear(), today.getMonth() + n, today.getDate());
  return [
    { value: iso(plusMonths(1)), label: 'En 1 mes' },
    { value: iso(plusMonths(3)), label: 'En 3 meses' },
    { value: iso(plusMonths(6)), label: 'En 6 meses' },
    { value: iso(new Date(today.getFullYear(), 11, 20)), label: 'Navidad' },
  ];
}
