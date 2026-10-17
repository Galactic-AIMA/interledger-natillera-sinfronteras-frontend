import { useEffect, useRef } from 'react';

import type { Natillera } from '@/api/types';

import { playSound } from './sounds';

/** Suena «monedas» cuando el fondo de la natillera crece mientras la persona la mira (su aporte o el de otro socio). */
export function useFundSound(natillera: Natillera | null | undefined): void {
  const last = useRef<{ id: string; total: bigint } | null>(null);
  useEffect(() => {
    if (!natillera) return;
    let total: bigint;
    try {
      total = BigInt(natillera.fundTotal.value);
    } catch {
      return;
    }
    const prev = last.current;
    last.current = { id: natillera.natilleraId, total };
    // La primera carga y el cambio de natillera no suenan: solo un aumento real del mismo fondo.
    if (prev && prev.id === natillera.natilleraId && total > prev.total) playSound('monedas');
  }, [natillera]);
}
