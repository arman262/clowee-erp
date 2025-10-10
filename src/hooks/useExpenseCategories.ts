import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/postgres/client';
import { toast } from 'sonner';

export interface ExpenseCategory {
  id: string;
  category_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useExpenseCategories = () => {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const data = await db.from('expense_categories').select().execute();
      return data as ExpenseCategory[];
    },
  });
};

export const useActiveExpenseCategories = () => {
  return useQuery({
    queryKey: ['expense-categories', 'active'],
    queryFn: async () => {
      const data = await db.from('expense_categories').select().execute();
      return (data as ExpenseCategory[]).filter(cat => cat.is_active);
    },
  });
};

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<ExpenseCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await db.from('expense_categories').insert(data).select().single();
      if (error) throw new Error(error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create expense category');
    },
  });
};

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ExpenseCategory> & { id: string }) => {
      const { data: result, error } = await db.from('expense_categories').update(data).eq('id', id).select().single();
      if (error) throw new Error(error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update expense category');
    },
  });
};

export const useDeleteExpenseCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('expense_categories').delete().eq('id', id).execute();
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete expense category');
    },
  });
};