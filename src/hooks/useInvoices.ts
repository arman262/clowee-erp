import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

type Invoice = Tables<'invoices'>;
type InvoiceInsert = TablesInsert<'invoices'>;
type InvoiceUpdate = TablesUpdate<'invoices'>;

export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await db
        .from('invoices')
        .select(`
          *,
          franchises (
            name
          ),
          machines (
            machine_name,
            machine_number
          )
        `)
        .order('created_at', { ascending: false });
      
      
      return data;
    }
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      const { data, error } = await db
        .from('invoices')
        .insert(invoice)
        .select()
        .single();
      
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create invoice: ' + error.message);
    }
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: InvoiceUpdate & { id: string }) => {
      const { data, error } = await db
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update invoice: ' + error.message);
    }
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('invoices')
        .delete()
        .eq('id', id);
      
      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete invoice: ' + error.message);
    }
  });
};