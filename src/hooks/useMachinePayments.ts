import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useMachinePayments() {
  return useQuery({
    queryKey: ["machine_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_payments")
        .select(`
          *,
          machines (
            id,
            machine_name,
            machine_number
          ),
          banks (
            id,
            bank_name
          )
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMachinePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<"machine_payments">) => {
      const { data: result, error } = await supabase
        .from("machine_payments")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_payments"] });
      toast.success("Payment added successfully");
    },
    onError: (error) => {
      console.error("Error creating payment:", error);
      toast.error("Failed to add payment");
    },
  });
}

export function useUpdateMachinePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & TablesUpdate<"machine_payments">) => {
      const { data: result, error } = await supabase
        .from("machine_payments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_payments"] });
      toast.success("Payment updated successfully");
    },
    onError: (error) => {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment");
    },
  });
}

export function useDeleteMachinePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("machine_payments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_payments"] });
      toast.success("Payment deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
    },
  });
}