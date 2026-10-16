// Store en memoria del último permiso recurrente creado (solo para el botón de demostración).
// No persiste: se pierde al recargar la app.
let lastGrantId: string | null = null;

export function setLastGrantId(grantId: string | null): void {
  lastGrantId = grantId;
}

export function getLastGrantId(): string | null {
  return lastGrantId;
}
