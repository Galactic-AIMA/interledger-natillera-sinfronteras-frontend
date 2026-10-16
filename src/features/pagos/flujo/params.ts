/** Los params de Expo Router pueden venir como string o lista: se toma el primero. */
export function param(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  return text ? text : undefined;
}
