import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";

type MachinePayment = {
  id: string;
  machine_id?: string;
  bank_id?: string;
  payment_date: string;
  amount: number;
  remarks?: string;
  created_at?: string;
};

export function useMachinePayments() {
  return useQuery({
    queryKey: ["machine_payments"],
    queryFn: async () => {
      return await db
        .from("machine_payments")
        .select("*")
        .order("payment_date", { ascending: false })
        .execute();
    },
  });
}

export function useCreateMachinePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MachinePayment, 'id' | 'created_at'>) => {
      const result = await db
        .from("machine_payments")
        .insert(data)
        .select()
        .single();

      
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
    mutationFn: async ({ id, ...data }: { id: string } & Partial<MachinePayment>) => {
      const result = await db
        .from("machine_payments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      
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
      await db
        .from("machine_payments")
        .delete()
        .eq("id", id)
        .execute();

      
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