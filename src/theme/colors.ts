// Paleta G · Índigo + Bosque (Figma "Natillera sin Fronteras · Pantallas v15").
export const colors = {
  indigo: '#1A1B4B', // Texto y botones
  indigo2: '#3F4C9A', // Acentos
  menta: '#A7C9B9', // Fondos suaves
  mentaOscura: '#4F7F6B', // Bordes
  verdeDinero: '#2F6F63', // Solo plata que entra o ahorro que crece
  fondo: '#F5F6FA', // Fondo de la app
  gris: '#5F626B', // Texto secundario
  alerta: '#B5543F', // Errores y avisos
  billetera: '#4A0E68', // Pantalla de la billetera
  blanco: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
