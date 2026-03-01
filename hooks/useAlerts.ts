import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  addAlert,
  deleteAlert,
  getAlerts,
  toggleAlert,
} from '@/services/alertsApi';
import { AlertInput } from '@/types/alerts';

const ALERTS_KEY = ['alerts'];

export function useAlerts() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ALERTS_KEY,
    queryFn: getAlerts,
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useAddAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AlertInput) => addAlert(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}

export function useToggleAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleAlert(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ALERTS_KEY }),
  });
}
