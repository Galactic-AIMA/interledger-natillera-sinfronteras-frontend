import { useSyncExternalStore } from 'react';

// Natillera activa: la que muestran Mi natillera, la cuota, los préstamos y las metas cuando la persona
// está en varias. Vive en memoria (al reabrir la app vuelve a la por defecto, la más antigua).
let activeId: string | null = null;
const listeners = new Set<() => void>();

export function setActiveNatillera(natilleraId: string | null) {
  if (activeId === natilleraId) return;
  activeId = natilleraId;
  listeners.forEach((listener) => listener());
}

export function getActiveNatillera() {
  return activeId;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useActiveNatilleraId() {
  return useSyncExternalStore(subscribe, getActiveNatillera, getActiveNatillera);
}
