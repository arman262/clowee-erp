import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Franchise = Tables<'franchises'>;
type FranchiseInsert = TablesInsert<'franchises'>;
type FranchiseUpdate = TablesUpdate<'franchises'>;

export const useFranchises = () => {
  return useQuery({
    queryKey: ['franchises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchises')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateFranchise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (franchise: FranchiseInsert) => {
      const { data, error } = await supabase
        .from('franchises')
        .insert(franchise)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchises'] });
      toast.success('Franchise created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create franchise: ' + error.message);
    }
  });
};

export const useUpdateFranchise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: FranchiseUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('franchises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchises'] });
      toast.success('Franchise updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update franchise: ' + error.message);
    }
  });
};

export const useDeleteFranchise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('franchises')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchises'] });
      toast.success('Franchise deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete franchise: ' + error.message);
    }
  });
};