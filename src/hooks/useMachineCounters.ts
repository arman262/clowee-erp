import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';
import { useNotificationMutations } from '@/hooks/useNotificationMutations';

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
      const [counters, users] = await Promise.all([
        db.from('machine_counters').select('*').order('reading_date', { ascending: false }).execute(),
        db.from('users').select('*').execute()
      ]);
      
      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.id, user);
      });
      
      const countersWithUsers = (counters || []).map(counter => ({
        ...counter,
        created_by_user: counter.created_by ? userMap.get(counter.created_by) : { name: 'System' }
      }));
      
      return countersWithUsers;
    }
  });
};

export const useCreateMachineCounter = () => {
  const queryClient = useQueryClient();
  const { notifyCreate } = useNotificationMutations();
  
  return useMutation({
    mutationFn: async (counter: Omit<MachineCounter, 'id' | 'created_at'>) => {
      const storedUser = sessionStorage.getItem('clowee_user');
      const userId = storedUser ? JSON.parse(storedUser).user.id : null;
      const insertData = userId ? { ...counter, created_by: userId } : counter;
      
      const { data } = await db
        .from('machine_counters')
        .insert(insertData)
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine_counters'] });
      queryClient.invalidateQueries({ queryKey: ['combined_counter_readings'] });
      toast.success('Counter reading recorded successfully');
      notifyCreate('Counter Reading');
    },
    onError: (error) => {
      toast.error('Failed to record counter reading: ' + error.message);
    }
  });
};

export const useUpdateMachineCounter = () => {
  const queryClient = useQueryClient();
  const { notifyUpdate } = useNotificationMutations();
  
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
      queryClient.invalidateQueries({ queryKey: ['combined_counter_readings'] });
      toast.success('Counter reading updated successfully');
      notifyUpdate('Counter Reading');
    },
    onError: (error) => {
      toast.error('Failed to update counter reading: ' + error.message);
    }
  });
};

export const useDeleteMachineCounter = () => {
  const queryClient = useQueryClient();
  const { notifyDelete } = useNotificationMutations();
  
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
      queryClient.invalidateQueries({ queryKey: ['combined_counter_readings'] });
      toast.success('Counter reading deleted successfully');
      notifyDelete('Counter Reading');
    },
    onError: (error) => {
      toast.error('Failed to delete counter reading: ' + error.message);
    }
  });
};