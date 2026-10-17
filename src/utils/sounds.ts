import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// Sonidos de aviso: «pago» cuando un pago queda hecho y «monedas» cuando el fondo de la natillera crece.
const SOURCES = {
  pago: require('../../assets/sounds/pago.wav'),
  monedas: require('../../assets/sounds/monedas.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

// El mismo aviso no se repite antes de esto (el resultado del pago y el refetch del inicio llegan casi juntos).
const COOLDOWN_MS = 6_000;

const players: Partial<Record<SoundName, AudioPlayer>> = {};
const lastPlayed: Partial<Record<SoundName, number>> = {};
let modeReady = false;

export function playSound(name: SoundName): void {
  const now = Date.now();
  if (now - (lastPlayed[name] ?? 0) < COOLDOWN_MS) return;
  lastPlayed[name] = now;
  try {
    if (!modeReady) {
      modeReady = true;
      // Que suene aunque el iPhone esté en silencio y sin cortar la música de la persona.
      void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    }
    const player = (players[name] ??= createAudioPlayer(SOURCES[name]));
    void player.seekTo(0).catch(() => undefined);
    player.play();
  } catch {
    // Un sonido nunca rompe la app.
  }
}
