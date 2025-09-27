import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useMachineExpenses() {
  return useQuery({
    queryKey: ["machine_expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machine_expenses")
        .select(`
          *,
          machines (
            id,
            machine_name,
            machine_number
          )
        `)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMachineExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<"machine_expenses">) => {
      const { data: result, error } = await supabase
        .from("machine_expenses")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_expenses"] });
      toast.success("Expense added successfully");
    },
    onError: (error) => {
      console.error("Error creating expense:", error);
      toast.error("Failed to add expense");
    },
  });
}

export function useUpdateMachineExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & TablesUpdate<"machine_expenses">) => {
      const { data: result, error } = await supabase
        .from("machine_expenses")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_expenses"] });
      toast.success("Expense updated successfully");
    },
    onError: (error) => {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    },
  });
}

export function useDeleteMachineExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("machine_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_expenses"] });
      toast.success("Expense deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    },
  });
}