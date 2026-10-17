import { useEffect, useState } from 'react';

/**
 * Devuelve `value` solo cuando lleva `ms` sin cambiar. Pensado para valores primitivos (texto, montos en
 * unidades menores): con un objeto nuevo en cada render el temporizador se reiniciaría sin fin.
 */
export function useDebouncedValue<T extends string | number | null>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
