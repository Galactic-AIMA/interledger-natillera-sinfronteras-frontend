/** Fecha corta de un movimiento en hora local: "15 oct · 9:00 a. m."; vacía si la fecha no es válida. */
export function formatMovementDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
  const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}
