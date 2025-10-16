import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";

export interface Notification {
  id: string;
  notification_type: string;
  message: string;
  related_module: string;
  user_id: string | null;
  user_name?: string;
  status: 'read' | 'unread';
  created_at: string;
}

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const [notifications, users] = await Promise.all([
        db.from("notifications").select("*").order("created_at", { ascending: false }).execute(),
        db.from("users").select("*").execute()
      ]);

      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.id, user);
      });

      return (notifications || []).map((n: any) => {
        const user = n.user_id ? userMap.get(n.user_id) : null;
        return {
          ...n,
          user_name: user?.name || user?.email || 'System'
        };
      });
    },
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'created_at' | 'status'>) => {
      const { data } = await db
        .from("notifications")
        .insert([notification])
        .select()
        .single();

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useUpdateNotificationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'read' | 'unread' }) => {
      const { data } = await db
        .from("notifications")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db
        .from("notifications")
        .delete()
        .eq("id", id)
        .execute();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const createNotification = async (
  type: string,
  message: string,
  module: string,
  userId?: string
) => {
  try {
    await db
      .from("notifications")
      .insert([{
        notification_type: type,
        message,
        related_module: module,
        user_id: userId || null,
        status: 'unread'
      }])
      .execute();
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};
