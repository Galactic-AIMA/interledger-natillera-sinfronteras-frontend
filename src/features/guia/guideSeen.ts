import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { GUIDE_IDS, type GuideId } from './guides';

// Guías ya ofrecidas en este celular: la oferta sale una sola vez por proceso, la acepte o no.
// Para repetirla está Ayuda. Se guarda igual que overlayPreference: SecureStore, o localStorage en web.
const STORAGE_KEY = 'natillera.guidesOffered';

const offered = new Set<GuideId>();
let loaded = false;
const waiting: (() => void)[] = [];

function webStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function parse(raw: string | null | undefined) {
  for (const id of (raw ?? '').split(',')) {
    if ((GUIDE_IDS as readonly string[]).includes(id)) offered.add(id as GuideId);
  }
}

function finishLoading() {
  loaded = true;
  waiting.splice(0).forEach((resolve) => resolve());
}

if (Platform.OS === 'web') {
  try {
    parse(webStorage()?.getItem(STORAGE_KEY));
  } catch {
    // sin almacenamiento: se ofrece en esta sesión
  }
  finishLoading();
} else {
  SecureStore.getItemAsync(STORAGE_KEY)
    .then(parse)
    .catch(() => undefined)
    .finally(finishLoading);
}

const ready = () => (loaded ? Promise.resolve() : new Promise<void>((resolve) => waiting.push(resolve)));

/** `true` si todavía no se ofreció la guía de este proceso en este celular. */
export async function shouldOffer(id: GuideId): Promise<boolean> {
  await ready();
  return !offered.has(id);
}

export function markOffered(id: GuideId) {
  if (offered.has(id)) return;
  offered.add(id);
  const raw = [...offered].join(',');
  if (Platform.OS === 'web') {
    try {
      webStorage()?.setItem(STORAGE_KEY, raw);
    } catch {
      // sin almacenamiento: queda en memoria
    }
    return;
  }
  SecureStore.setItemAsync(STORAGE_KEY, raw).catch(() => undefined);
}
