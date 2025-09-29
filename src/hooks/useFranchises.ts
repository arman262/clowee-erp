import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

type Franchise = {
  id: string;
  name: string;
  coin_price: number;
  doll_price: number;
  electricity_cost: number;
  vat_percentage?: number;
  franchise_share: number;
  clowee_share: number;
  payment_duration: string;
  maintenance_percentage?: number;
  security_deposit_type?: string;
  security_deposit_notes?: string;
  agreement_copy?: string;
  trade_nid_copy?: string[];
  created_at?: string;
  updated_at?: string;
};

export const useFranchises = () => {
  return useQuery({
    queryKey: ['franchises'],
    queryFn: async () => {
      return await db
        .from('franchises')
        .select('*')
        .order('created_at', { ascending: false })
        .execute();
    }
  });
};

export const useCreateFranchise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (franchise: Omit<Franchise, 'id' | 'created_at' | 'updated_at'>) => {
      const { data } = await db
        .from('franchises')
        .insert(franchise)
        .select()
        .single();
      
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
    mutationFn: async ({ id, ...updates }: Partial<Franchise> & { id: string }) => {
      const { data } = await db
        .from('franchises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
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
      await db
        .from('franchises')
        .delete()
        .eq('id', id)
        .execute();
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