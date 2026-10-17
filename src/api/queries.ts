import { useQuery } from '@tanstack/react-query';

import { useApi } from './ApiProvider';
import { ApiError } from './client';
import { setActiveNatillera, useActiveNatilleraId } from './activeNatillera';

// Claves compartidas: tras un pago, invalidar con queryClient.invalidateQueries({ queryKey: keys.x }).
export const keys = {
  me: ['me'] as const,
  natillera: ['natillera'] as const,
  payments: ['payments'] as const,
  accounts: ['accounts'] as const,
  myLoans: ['loans', 'mine'] as const,
  pendingLoans: ['loans', 'pending'] as const,
  goals: ['goals'] as const,
};

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.me, api.mode], queryFn: () => api.getMe() });
}

export function useMyNatillera() {
  const api = useApi();
  const activeId = useActiveNatilleraId();
  return useQuery({
    queryKey: [...keys.natillera, api.mode, activeId ?? 'default'],
    queryFn: async () => {
      if (!activeId) return api.getMyNatillera();
      try {
        return await api.getMyNatillera(activeId);
      } catch (error) {
        // La activa ya no es de esta persona (otra sesión, o la sacaron): se vuelve a la por defecto.
        if (error instanceof ApiError && error.status === 404) {
          setActiveNatillera(null);
          return api.getMyNatillera();
        }
        throw error;
      }
    },
  });
}

/** Todas las natilleras de la persona, para el selector de Mi natillera. */
export function useMyNatilleras() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.natillera, 'list', api.mode], queryFn: () => api.listMyNatilleras() });
}

export function usePayments() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.payments, api.mode], queryFn: () => api.listPayments() });
}

export function useAccounts() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.accounts, api.mode], queryFn: () => api.listAccounts() });
}

// Préstamos de la natillera que se está mostrando. Sin `natilleraId` el back devuelve los de la más
// reciente, y Mi natillera muestra por defecto la más antigua: así las dos pantallas siempre coinciden.
function useShownNatilleraId() {
  const natillera = useMyNatillera();
  return { natilleraId: natillera.data?.natilleraId, ready: !natillera.isPending };
}

export function useMyLoans() {
  const api = useApi();
  const { natilleraId, ready } = useShownNatilleraId();
  return useQuery({
    queryKey: [...keys.myLoans, api.mode, natilleraId ?? 'default'],
    queryFn: () => api.getMyLoans(natilleraId),
    enabled: ready,
  });
}

export function usePendingLoanRequests() {
  const api = useApi();
  const { natilleraId, ready } = useShownNatilleraId();
  return useQuery({
    queryKey: [...keys.pendingLoans, api.mode, natilleraId ?? 'default'],
    queryFn: () => api.listPendingLoanRequests(natilleraId),
    enabled: ready,
  });
}

export function useGoals() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.goals, api.mode], queryFn: () => api.listGoals() });
}

export function useGoal(goalId: string | undefined) {
  const api = useApi();
  return useQuery({ queryKey: [...keys.goals, api.mode, goalId], queryFn: () => api.getGoal(goalId ?? ''), enabled: Boolean(goalId) });
}
