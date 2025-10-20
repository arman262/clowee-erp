import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://202.59.208.112:3008/api';

export function useBankMoneyLogs() {
  return useQuery({
    queryKey: ['bank_money_logs'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/bank_money_logs`);
      const result = await response.json();
      return result.data;
    },
  });
}

export function useCreateBankMoneyLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${API_URL}/bank_money_logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_money_logs'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
  });
}

export function useUpdateBankMoneyLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`${API_URL}/bank_money_logs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_money_logs'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
  });
}

export function useDeleteBankMoneyLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/bank_money_logs/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_money_logs'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
  });
}
