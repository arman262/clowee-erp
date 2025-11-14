import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

type InventoryItem = {
  id: string;
  item_name: string;
  category?: string;
  quantity: number;
  unit?: string;
  purchase_price?: number;
  selling_price?: number;
  supplier?: string;
  date_of_entry?: string;
  remarks?: string;
  low_stock_threshold?: number;
  created_at?: string;
  updated_at?: string;
};

type InventoryLog = {
  id: string;
  item_id: string;
  type: 'add' | 'deduct';
  quantity: number;
  remaining_stock: number;
  handled_by?: string;
  remarks?: string;
  created_at: string;
};

export const useInventoryItems = () => {
  return useQuery({
    queryKey: ['inventory_items'],
    queryFn: async () => {
      const { data, error } = await db
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });
};

export const useInventoryLogs = () => {
  return useQuery({
    queryKey: ['inventory_logs'],
    queryFn: async () => {
      const data = await db.from('inventory_logs').select().execute();
      return data || [];
    }
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await db
        .from('inventory_items')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast.success('Item added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add item: ' + error.message);
    }
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await db
        .from('inventory_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast.success('Item updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update item: ' + error.message);
    }
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('inventory_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      toast.success('Item deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete item: ' + error.message);
    }
  });
};

export const useStockAdjustment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, type, quantity, remarks, handledBy }: { 
      itemId: string; 
      type: 'add' | 'deduct'; 
      quantity: number; 
      remarks?: string;
      handledBy?: string;
    }) => {
      const { data: item, error: fetchError } = await db
        .from('inventory_items')
        .select('quantity')
        .eq('id', itemId)
        .single();
      if (fetchError) throw fetchError;
      
      const newQuantity = type === 'add' ? item.quantity + quantity : item.quantity - quantity;
      if (newQuantity < 0) throw new Error('Insufficient stock');
      
      const { error: updateError } = await db
        .from('inventory_items')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (updateError) throw updateError;
      
      const { error: logError } = await db
        .from('inventory_logs')
        .insert({
          item_id: itemId,
          type,
          quantity,
          remaining_stock: newQuantity,
          handled_by: handledBy,
          remarks
        });
      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_logs'] });
      toast.success('Stock adjusted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to adjust stock: ' + error.message);
    }
  });
};

export const useDeleteInventoryLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('inventory_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_logs'] });
      toast.success('Log deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete log: ' + error.message);
    }
  });
};

export const usePrizeStock = () => {
  return useQuery({
    queryKey: ['prize_stock'],
    queryFn: async () => {
      const allExpenses = await db.from('machine_expenses').select('*').execute();
      const allCategories = await db.from('expense_categories').select('*').execute();
      const allSales = await db.from('sales').select('*').execute();
      
      const prizeCategoryId = (allCategories || []).find((cat: any) => cat.category_name === 'Prize Purchase')?.id;
      
      const prizeExpenses = (allExpenses || []).filter((exp: any) => exp.category_id === prizeCategoryId);
      
      const totalPrizePurchase = prizeExpenses.reduce((sum: number, exp: any) => sum + (Number(exp.quantity) || 0), 0);
      const totalPrizeOut = (allSales || []).reduce((sum: number, sale: any) => sum + (Number(sale.prize_out_quantity) || 0), 0);
      const totalDollsInStock = totalPrizePurchase - totalPrizeOut;
      
      console.log('Prize Expenses:', prizeExpenses.length, 'Total Qty:', totalPrizePurchase);
      console.log('Total Prize Out:', totalPrizeOut);
      console.log('Total Dolls in Stock:', totalDollsInStock);
      
      return {
        totalPrizePurchase,
        totalPrizeOut,
        totalDollsInStock
      };
    }
  });
};

export const useMachineWisePrizeStock = () => {
  return useQuery({
    queryKey: ['machine_wise_prize_stock'],
    queryFn: async () => {
      const machines = await db.from('machines').select().execute();
      const expenses = await db.from('machine_expenses').select().execute();
      const categories = await db.from('expense_categories').select().execute();
      const prizeCategoryId = (categories || []).find((cat: any) => cat.category_name === 'Prize Purchase')?.id;
      const prizeExpenses = (expenses || []).filter((exp: any) => exp.category_id === prizeCategoryId);
      const sales = await db.from('sales').select().execute();
      
      const result = (machines || []).map((machine: any) => {
        const purchased = prizeExpenses
          .filter((exp: any) => exp.machine_id === machine.id)
          .reduce((sum: number, exp: any) => sum + (Number(exp.quantity) || 0), 0);
        
        const prizeOut = (sales || [])
          .filter((sale: any) => sale.machine_id === machine.id)
          .reduce((sum: number, sale: any) => sum + (Number(sale.prize_out_quantity) || 0), 0);
        
        return {
          machineId: machine.id,
          machineName: machine.machine_name,
          purchased,
          prizeOut,
          stock: purchased - prizeOut
        };
      });
      
      return result;
    }
  });
};