import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";

type MachineExpense = {
  id: string;
  machine_id?: string;
  expense_date: string;
  category: string;
  amount: number;
  description?: string;
  created_at?: string;
};

export function useMachineExpenses() {
  return useQuery({
    queryKey: ["machine_expenses"],
    queryFn: async () => {
      // Fetch expenses and machines separately
      const [expenses, machines] = await Promise.all([
        db.from("machine_expenses").select("*").order("expense_date", { ascending: false }).execute(),
        db.from("machines").select("*").execute()
      ]);

      // Create machine lookup map
      const machineMap = new Map();
      machines?.forEach(machine => {
        machineMap.set(machine.id, machine);
      });

      // Join expenses with machine data
      const expensesWithMachines = (expenses || []).map(expense => ({
        ...expense,
        machines: expense.machine_id ? machineMap.get(expense.machine_id) : null
      }));

      return expensesWithMachines;
    },
  });
}

export function useCreateMachineExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MachineExpense, 'id' | 'created_at'>) => {
      const { data: result } = await db
        .from("machine_expenses")
        .insert(data)
        .select()
        .single();

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
    mutationFn: async ({ id, ...data }: { id: string } & Partial<MachineExpense>) => {
      const { data: result } = await db
        .from("machine_expenses")
        .update(data)
        .eq("id", id)
        .select()
        .single();

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
      await db
        .from("machine_expenses")
        .delete()
        .eq("id", id)
        .execute();
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