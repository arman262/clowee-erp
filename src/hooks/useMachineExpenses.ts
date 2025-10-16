import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";
import { useNotificationMutations } from "@/hooks/useNotificationMutations";

type MachineExpense = {
  id: string;
  machine_id?: string;
  expense_date: string;
  expense_details: string;
  unique_id?: string;
  quantity: number;
  item_price: number;
  total_amount: number;
  created_at?: string;
};

export function useMachineExpenses() {
  return useQuery({
    queryKey: ["machine_expenses"],
    queryFn: async () => {
      // Fetch expenses, machines, categories, banks, and users separately
      const [expenses, machines, categories, banks, users] = await Promise.all([
        db.from("machine_expenses").select("*").order("expense_date", { ascending: false }).execute(),
        db.from("machines").select("*").execute(),
        db.from("expense_categories").select("*").execute(),
        db.from("banks").select("*").execute(),
        db.from("users").select("*").execute()
      ]);

      // Create lookup maps
      const machineMap = new Map();
      machines?.forEach(machine => {
        machineMap.set(machine.id, machine);
      });

      const categoryMap = new Map();
      categories?.forEach(category => {
        categoryMap.set(category.id, category);
      });

      const bankMap = new Map();
      banks?.forEach(bank => {
        bankMap.set(bank.id, bank);
      });

      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.id, user);
      });

      // Join expenses with machine, category, bank, and user data
      const expensesWithDetails = (expenses || []).map(expense => ({
        ...expense,
        machines: expense.machine_id ? machineMap.get(expense.machine_id) : null,
        expense_categories: expense.category_id ? categoryMap.get(expense.category_id) : null,
        banks: expense.bank_id ? bankMap.get(expense.bank_id) : null,
        created_by_user: expense.created_by ? userMap.get(expense.created_by) : { name: 'System' }
      }));

      return expensesWithDetails;
    },
  });
}

export function useCreateMachineExpense() {
  const queryClient = useQueryClient();
  const { notifyCreate } = useNotificationMutations();

  return useMutation({
    mutationFn: async (data: Omit<MachineExpense, 'id' | 'created_at'>) => {
      const storedUser = localStorage.getItem('clowee_user');
      const userId = storedUser ? JSON.parse(storedUser).user.id : null;
      const insertData = userId ? { ...data, created_by: userId } : data;
      
      const { data: result } = await db
        .from("machine_expenses")
        .insert(insertData)
        .select()
        .single();

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_expenses"] });
      toast.success("Expense added successfully");
      notifyCreate("Expense");
    },
    onError: (error) => {
      console.error("Error creating expense:", error);
      toast.error("Failed to add expense");
    },
  });
}

export function useUpdateMachineExpense() {
  const queryClient = useQueryClient();
  const { notifyUpdate } = useNotificationMutations();

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
      notifyUpdate("Expense");
    },
    onError: (error) => {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    },
  });
}

export function useDeleteMachineExpense() {
  const queryClient = useQueryClient();
  const { notifyDelete } = useNotificationMutations();

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
      notifyDelete("Expense");
    },
    onError: (error) => {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    },
  });
}