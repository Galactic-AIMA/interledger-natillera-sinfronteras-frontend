import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

// Preferencia "mostrar el botón flotante del registro". Apagada por defecto; se activa en Su cuenta.
// Se guarda en SecureStore (en web solo vive en memoria, igual que los tokens en src/api/auth.ts).
const STORAGE_KEY = 'natillera.logsOverlay';

let showOverlay = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setShowOverlay(value: boolean) {
  showOverlay = value;
  emit();
  if (Platform.OS === 'web') return;
  const save = value ? SecureStore.setItemAsync(STORAGE_KEY, '1') : SecureStore.deleteItemAsync(STORAGE_KEY);
  save.catch(() => undefined); // si no se puede guardar, la preferencia sigue en memoria
}

// Carga lo guardado al arrancar la app (sin bloquear nada: mientras tanto el botón sigue apagado).
if (Platform.OS !== 'web') {
  SecureStore.getItemAsync(STORAGE_KEY)
    .then((raw) => {
      if (raw === '1' && !showOverlay) {
        showOverlay = true;
        emit();
      }
    })
    .catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => showOverlay;

/** `true` si el botón flotante del registro debe verse. */
export function useShowOverlay(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
