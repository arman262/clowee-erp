import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export function useAttachments(franchiseId?: string) {
  return useQuery({
    queryKey: ["attachments", franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];
      
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("franchise_id", franchiseId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data as Tables<"attachments">[];
    },
    enabled: !!franchiseId,
  });
}

export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<"attachments">) => {
      const { data: attachment, error } = await supabase
        .from("attachments")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return attachment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", data.franchise_id] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("attachments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
    },
  });
}