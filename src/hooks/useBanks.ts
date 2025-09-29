import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";

type Bank = {
  id: string;
  bank_name: string;
  account_number?: string;
  account_holder_name?: string;
  branch_name?: string;
  routing_number?: string;
  is_active?: boolean;
  created_at?: string;
};

export function useBanks() {
  return useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      return await db
        .from("banks")
        .select("*")
        .order("bank_name", { ascending: true })
        .execute();
    },
  });
}

export function useCreateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Bank, 'id' | 'created_at'>) => {
      const result = await db
        .from("banks")
        .insert(data)
        .select()
        .single();

      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Bank added successfully");
    },
    onError: (error) => {
      console.error("Error creating bank:", error);
      toast.error("Failed to add bank");
    },
  });
}

export function useUpdateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Bank>) => {
      const result = await db
        .from("banks")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Bank updated successfully");
    },
    onError: (error) => {
      console.error("Error updating bank:", error);
      toast.error("Failed to update bank");
    },
  });
}

export function useDeleteBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db
        .from("banks")
        .delete()
        .eq("id", id)
        .execute();

      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Bank deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting bank:", error);
      toast.error("Failed to delete bank");
    },
  });
}