import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type MachineCounter = Tables<'machine_counters'>;
type MachineCounterInsert = TablesInsert<'machine_counters'>;
type MachineCounterUpdate = TablesUpdate<'machine_counters'>;

export const useMachineCounters = () => {
  return useQuery({
    queryKey: ['machine_counters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_counters')
        .select(`
          *,
          machines (
            machine_name,
            machine_number,
            franchises (
              name
            )
          )
        `)
        .order('reading_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateMachineCounter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (counter: MachineCounterInsert) => {
      const { data, error } = await supabase
        .from('machine_counters')
        .insert(counter)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine_counters'] });
      toast.success('Counter reading recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record counter reading: ' + error.message);
    }
  });
};

export const useUpdateMachineCounter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: MachineCounterUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('machine_counters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine_counters'] });
      toast.success('Counter reading updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update counter reading: ' + error.message);
    }
  });
};

export const useDeleteMachineCounter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('machine_counters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine_counters'] });
      toast.success('Counter reading deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete counter reading: ' + error.message);
    }
  });
};