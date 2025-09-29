import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

type InventoryItem = {
  id: string;
  item_name: string;
  sku?: string;
  category?: string;
  quantity: number;
  unit_cost?: number;
  total_value?: number;
  supplier?: string;
  created_at?: string;
};

export const useInventoryItems = () => {
  return useQuery({
    queryKey: ['inventory_items'],
    queryFn: async () => {
      return await db
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false })
        .execute();
    }
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at'>) => {
      const { data } = await db
        .from('inventory_items')
        .insert(item)
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast.success('Inventory item created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create inventory item: ' + error.message);
    }
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data } = await db
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast.success('Inventory item updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update inventory item: ' + error.message);
    }
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await db
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast.success('Inventory item deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete inventory item: ' + error.message);
    }
  });
};