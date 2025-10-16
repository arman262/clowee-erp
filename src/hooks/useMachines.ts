import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';
import { useNotificationMutations } from '@/hooks/useNotificationMutations';

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
  status?: string;
  location?: string;
  last_maintenance_date?: string;
  created_at?: string;
  updated_at?: string;
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
  const { notifyCreate } = useNotificationMutations();
  
  return useMutation({
    mutationFn: async (machine: Omit<Machine, 'id' | 'created_at'>) => {
      const { data } = await db
        .from('machines')
        .insert(machine)
        .select()
        .single();
      
      // Create initial counter reading with installation date
      if (data && (machine.initial_coin_counter > 0 || machine.initial_prize_counter > 0)) {
        await db.from('machine_counters').insert({
          machine_id: data.id,
          reading_date: machine.installation_date,
          coin_counter: machine.initial_coin_counter,
          prize_counter: machine.initial_prize_counter,
          notes: 'Initial counter values from machine installation'
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machine_counters'] });
      toast.success('Machine created successfully');
      notifyCreate('Machine', data?.machine_name);
    },
    onError: (error) => {
      toast.error('Failed to create machine: ' + error.message);
    }
  });
};

export const useUpdateMachine = () => {
  const queryClient = useQueryClient();
  const { notifyUpdate } = useNotificationMutations();
  
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine updated successfully');
      notifyUpdate('Machine', data?.machine_name);
    },
    onError: (error) => {
      toast.error('Failed to update machine: ' + error.message);
    }
  });
};

export const useDeleteMachine = () => {
  const queryClient = useQueryClient();
  const { notifyDelete } = useNotificationMutations();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related records first
      await db.from('invoices').delete().eq('machine_id', id).execute();
      await db.from('machine_counters').delete().eq('machine_id', id).execute();
      await db.from('machine_payments').delete().eq('machine_id', id).execute();
      
      // Then delete the machine
      await db.from('machines').delete().eq('id', id).execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['machine_counters'] });
      queryClient.invalidateQueries({ queryKey: ['machine_payments'] });
      toast.success('Machine deleted successfully');
      notifyDelete('Machine');
    },
    onError: (error) => {
      toast.error('Failed to delete machine: ' + error.message);
    }
  });
};