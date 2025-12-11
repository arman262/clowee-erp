import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/postgres/client';

const API_URL = import.meta.env.VITE_API_URL || 'https://erp.tolpar.com.bd/api';

export function useBankMoneyLogs() {
  return useQuery({
    queryKey: ['bank_money_logs'],
    queryFn: async () => {
      const data = await db.from('bank_money_logs').select('*').execute();
      return data || [];
    },
  });
}

export function useCreateBankMoneyLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const result = await db
        .from('bank_money_logs')
        .insert(data)
        .select()
        .single();

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
      const result = await db
        .from('bank_money_logs')
        .update(data)
        .eq('id', id)
        .select()
        .single();

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
      const result = await db
        .from('bank_money_logs')
        .delete()
        .eq('id', id)
        .execute();

      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_money_logs'] });
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
  });
}
