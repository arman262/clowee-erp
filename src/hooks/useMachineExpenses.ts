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
        db.from("machine_expenses").select("*").order("created_at", { ascending: false }).execute(),
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
      const storedUser = sessionStorage.getItem('clowee_user');
      const userId = storedUser ? JSON.parse(storedUser).user.id : null;
      
      // Get the next expense number
      const allExpenses = await db.from("machine_expenses").select("expense_number").execute();
      const maxNumber = allExpenses?.reduce((max, exp) => {
        const match = exp.expense_number?.match(/clw-ex-(\d+)/);
        const num = match ? parseInt(match[1]) : 0;
        return Math.max(max, num);
      }, 0) || 0;
      const nextNumber = maxNumber + 1;
      const expenseNumber = `clw-ex-${nextNumber.toString().padStart(4, '0')}`;
      
      const insertData = userId ? { ...data, created_by: userId, expense_number: expenseNumber } : { ...data, expense_number: expenseNumber };
      
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
    onError: (error: any) => {
      console.error("Error creating expense:", error);
      console.error("Error message:", error?.message);
      console.error("Error details:", error?.details);
      console.error("Error hint:", error?.hint);
      toast.error(`Failed to add expense: ${error?.message || 'Unknown error'}`);
    },
  });
}

export function useUpdateMachineExpense() {
  const queryClient = useQueryClient();
  const { notifyUpdate } = useNotificationMutations();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<MachineExpense>) => {
      console.log('Updating expense with data:', { id, ...data });
      
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== '')
      );
      
      console.log('Cleaned data:', cleanData);
      
      const result = await db
        .from("machine_expenses")
        .update(cleanData)
        .eq("id", id)
        .select()
        .single();

      console.log('Update result:', result);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine_expenses"] });
      toast.success("Expense updated successfully");
      notifyUpdate("Expense");
    },
    onError: (error: any) => {
      console.error("Error updating expense:", error);
      console.error("Error details:", error?.message, error?.details);
      toast.error(`Failed to update expense: ${error?.message || 'Unknown error'}`);
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