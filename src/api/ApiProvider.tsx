import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { NatilleraApi } from './client';
import { config } from './config';
import { httpApi } from './httpApi';
import { mockApi } from './mockApi';

type SessionState = 'checking' | 'signed-out' | 'signed-in';

type ApiContextValue = {
  api: NatilleraApi;
  session: SessionState;
  // "Empezar con datos de ejemplo" (pantalla 01): modo demo con Doña Rosa.
  enterDemo: (username?: string) => Promise<void>;
  // Cambia a la API real (AWS), p. ej. desde la pantalla 04.
  useRealApi: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [api, setApi] = useState<NatilleraApi>(config.startInDemo ? mockApi : httpApi);
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
      queryClient.clear();
      mockApi.switchUser(username);
      setApi(mockApi);
      setSession('signed-in');
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
        setApi(httpApi);
      },
      login: async (username, password) => {
        await api.login(username, password);
        queryClient.clear();
        setSession('signed-in');
      },
      logout: async () => {
        await api.logout();
        queryClient.clear();
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
