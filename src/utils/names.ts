const HONORIFICS = /^(doña|don|sra\.?|sr\.?|señora|señor)$/i;

/** Primer nombre sin tratamiento: «Doña Rosa Gómez» → «Rosa». Vacío si no hay nombre. */
export function firstName(name: string | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return words.find((word) => !HONORIFICS.test(word)) ?? words[0] ?? '';
}
