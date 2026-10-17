import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setActiveNatillera } from './activeNatillera';
import type { NatilleraApi } from './client';
import { config } from './config';
import { hybridApi } from './hybridApi';
import { mockApi } from './mockApi';

type SessionState = 'checking' | 'signed-out' | 'signed-in';

type ApiContextValue = {
  api: NatilleraApi;
  session: SessionState;
  // "Empezar con datos de ejemplo" (pantalla 01): modo demo con Doña Rosa.
  enterDemo: (username?: string) => Promise<void>;
  // Cambia a la API real (AWS, en modo híbrido mientras el back sale por partes).
  useRealApi: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [api, setApi] = useState<NatilleraApi>(config.startInDemo ? mockApi : hybridApi);
  const [session, setSession] = useState<SessionState>('checking');

  useEffect(() => {
    let alive = true;
    api.hasSession().then((has) => alive && setSession(has ? 'signed-in' : 'signed-out')).catch(() => alive && setSession('signed-out'));
    return () => {
      alive = false;
    };
  }, [api]);

  const enterDemo = useCallback(
    async (username = 'rosa.gomez') => {
      mockApi.switchUser(username);
      setActiveNatillera(null);
      setApi(mockApi);
      setSession('signed-in');
      // Vuelve a pedir lo que está en pantalla con el usuario nuevo.
      await queryClient.resetQueries();
    },
    [queryClient],
  );

  const value = useMemo<ApiContextValue>(
    () => ({
      api,
      session,
      enterDemo,
      useRealApi: () => {
        queryClient.clear();
        setApi(hybridApi);
      },
      login: async (username, password) => {
        await api.login(username, password);
        setActiveNatillera(null);
        queryClient.clear();
        setSession('signed-in');
      },
      logout: async () => {
        await api.logout();
        setActiveNatillera(null);
        queryClient.clear();
        // Al salir de la demo, "Ya tengo cuenta" debe entrar contra Cognito, no contra los datos de ejemplo.
        setApi(config.startInDemo ? mockApi : hybridApi);
        setSession('signed-out');
      },
    }),
    [api, session, enterDemo, queryClient],
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext(): ApiContextValue {
  const value = useContext(ApiContext);
  if (!value) throw new Error('useApiContext debe usarse dentro de <ApiProvider>');
  return value;
}

/** La API activa (real o demo). Las pantallas solo usan esto o los hooks de queries.ts. */
export function useApi(): NatilleraApi {
  return useApiContext().api;
}
