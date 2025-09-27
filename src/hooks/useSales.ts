import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          franchises (
            id,
            name,
            coin_price,
            doll_price
          ),
          machines (
            id,
            machine_name,
            machine_number
          )
        `)
        .order("sales_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<"sales">) => {
      console.log('Attempting to insert sales data:', data);
      const { data: result, error } = await supabase
        .from("sales")
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sales data saved successfully");
    },
    onError: (error: any) => {
      console.error("Error creating sale:", error);
      const errorMessage = error?.message || 'Unknown error';
      toast.error(`Failed to save sales data: ${errorMessage}`);
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & TablesUpdate<"sales">) => {
      const { data: result, error } = await supabase
        .from("sales")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sales data updated successfully");
    },
    onError: (error) => {
      console.error("Error updating sale:", error);
      toast.error("Failed to update sales data");
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Sales data deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting sale:", error);
      toast.error("Failed to delete sales data");
    },
  });
}