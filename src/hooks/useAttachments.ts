import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";

type Attachment = {
  id: string;
  franchise_id?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at?: string;
};

export function useAttachments(franchiseId?: string) {
  return useQuery({
    queryKey: ["attachments", franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];
      
      const data = await db
        .from("attachments")
        .select("*")
        .execute();

      return data.filter((item: any) => item.franchise_id === franchiseId);
    },
    enabled: !!franchiseId,
  });
}

export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Attachment, 'id' | 'uploaded_at'>) => {
      const attachment = await db
        .from("attachments")
        .insert(data)
        .select()
        .single();

      
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
      await db
        .from("attachments")
        .delete()
        .eq("id", id)
        .execute();

      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
    },
  });
}