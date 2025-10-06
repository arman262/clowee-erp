import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

type MachineCounter = {
  id: string;
  machine_id?: string;
  reading_date: string;
  coin_counter: number;
  prize_counter: number;
  notes?: string;
  created_at?: string;
};

export const useMachineCounters = () => {
  return useQuery({
    queryKey: ['machine_counters'],
    queryFn: async () => {
      return await db
        .from('machine_counters')
        .select('*')
        .order('reading_date', { ascending: false })
        .execute() || [];
    }
  });
};

export const useCreateMachineCounter = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (counter: Omit<MachineCounter, 'id' | 'created_at'>) => {
      const { data } = await db
        .from('machine_counters')
        .insert(counter)
        .select()
        .single();
      
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
    mutationFn: async ({ id, ...updates }: Partial<MachineCounter> & { id: string }) => {
      const { data } = await db
        .from('machine_counters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
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
      await db
        .from('machine_counters')
        .delete()
        .eq('id', id)
        .execute();
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