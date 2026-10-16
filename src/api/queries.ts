import { useQuery } from '@tanstack/react-query';

import { useApi } from './ApiProvider';

// Claves compartidas: tras un pago, invalidar con queryClient.invalidateQueries({ queryKey: keys.x }).
export const keys = {
  me: ['me'] as const,
  natillera: ['natillera'] as const,
  payments: ['payments'] as const,
  accounts: ['accounts'] as const,
  myLoans: ['loans', 'mine'] as const,
  pendingLoans: ['loans', 'pending'] as const,
};

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.me, api.mode], queryFn: () => api.getMe() });
}

export function useMyNatillera() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.natillera, api.mode], queryFn: () => api.getMyNatillera() });
}

export function usePayments() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.payments, api.mode], queryFn: () => api.listPayments() });
}

export function useAccounts() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.accounts, api.mode], queryFn: () => api.listAccounts() });
}

export function useMyLoans() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.myLoans, api.mode], queryFn: () => api.getMyLoans() });
}

export function usePendingLoanRequests() {
  const api = useApi();
  return useQuery({ queryKey: [...keys.pendingLoans, api.mode], queryFn: () => api.listPendingLoanRequests() });
}
