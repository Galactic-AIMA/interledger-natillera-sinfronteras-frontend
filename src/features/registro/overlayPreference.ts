import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

// Preferencia "mostrar el botón flotante del registro". Encendida por defecto (la app se presenta en
// el pitch con el registro a la vista); solo se recuerda cuando alguien la apaga, en Su cuenta o con
// el ojo del panel. Se guarda en SecureStore; en web, en localStorage (si el navegador lo permite).
const STORAGE_KEY = 'natillera.logsOverlay';
const OFF = '0';

let showOverlay = true;
let touched = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function webStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function setShowOverlay(value: boolean) {
  showOverlay = value;
  touched = true;
  emit();
  if (Platform.OS === 'web') {
    try {
      if (value) webStorage()?.removeItem(STORAGE_KEY);
      else webStorage()?.setItem(STORAGE_KEY, OFF);
    } catch {
      // sin almacenamiento: la preferencia sigue en memoria
    }
    return;
  }
  const save = value ? SecureStore.deleteItemAsync(STORAGE_KEY) : SecureStore.setItemAsync(STORAGE_KEY, OFF);
  save.catch(() => undefined); // si no se puede guardar, la preferencia sigue en memoria
}

// Carga lo guardado al arrancar la app (sin bloquear nada: mientras tanto el botón se ve).
if (Platform.OS === 'web') {
  try {
    if (webStorage()?.getItem(STORAGE_KEY) === OFF) showOverlay = false;
  } catch {
    // sin almacenamiento: queda encendido
  }
} else {
  SecureStore.getItemAsync(STORAGE_KEY)
    .then((raw) => {
      if (raw === OFF && !touched) {
        showOverlay = false;
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
