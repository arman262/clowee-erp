import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

type Machine = {
  id: string;
  machine_name: string;
  machine_number: string;
  esp_id: string;
  franchise_id?: string;
  branch_location: string;
  installation_date: string;
  initial_coin_counter: number;
  initial_prize_counter: number;
  notes?: string;
  created_at?: string;
  franchises?: { name: string } | null;
};

export const useMachines = () => {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      // Fetch machines and franchises separately
      const [machines, franchises] = await Promise.all([
        db.from('machines').select('*').order('created_at', { ascending: false }).execute(),
        db.from('franchises').select('*').execute()
      ]);
      
      // Join the data client-side
      const machinesWithFranchises = (machines || []).map((machine: any) => ({
        ...machine,
        franchises: machine.franchise_id 
          ? franchises?.find((f: any) => f.id === machine.franchise_id) || null
          : null
      }));
      
      return machinesWithFranchises;
    }
  });
};

export const useCreateMachine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (machine: Omit<Machine, 'id' | 'created_at'>) => {
      const { data } = await db
        .from('machines')
        .insert(machine)
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create machine: ' + error.message);
    }
  });
};

export const useUpdateMachine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Machine> & { id: string }) => {
      const { data } = await db
        .from('machines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update machine: ' + error.message);
    }
  });
};

export const useDeleteMachine = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await db
        .from('machines')
        .delete()
        .eq('id', id)
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete machine: ' + error.message);
    }
  });
};