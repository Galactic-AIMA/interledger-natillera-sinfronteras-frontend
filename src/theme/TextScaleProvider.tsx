import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { textScales } from './tokens';

type TextScaleContextValue = {
  scale: number;
  level: number;
  // Pasa al siguiente tamaño y vuelve al normal después del más grande.
  cycle: () => void;
};

const TextScaleContext = createContext<TextScaleContextValue>({ scale: 1, level: 0, cycle: () => {} });

export function TextScaleProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState(0);
  const value = useMemo(
    () => ({
      level,
      scale: textScales[level] ?? 1,
      cycle: () => setLevel((current) => (current + 1) % textScales.length),
    }),
    [level],
  );
  return <TextScaleContext.Provider value={value}>{children}</TextScaleContext.Provider>;
}

export function useTextScale() {
  return useContext(TextScaleContext);
}
