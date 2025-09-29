import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

type Expense = {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  description?: string;
  created_by?: string;
  created_at?: string;
};

export const useExpenses = () => {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      return await db
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .execute();
    }
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'created_at'>) => {
      const { data } = await db
        .from('expenses')
        .insert(expense)
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record expense: ' + error.message);
    }
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const { data } = await db
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update expense: ' + error.message);
    }
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await db
        .from('expenses')
        .delete()
        .eq('id', id)
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete expense: ' + error.message);
    }
  });
};