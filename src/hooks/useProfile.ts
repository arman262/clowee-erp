import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileUpdateData & { userId: string }) => {
      const { userId, currentPassword, newPassword, ...profileData } = data;
      
      let updateData: any = {};
      
      if (profileData.firstName) updateData.first_name = profileData.firstName;
      if (profileData.lastName) updateData.last_name = profileData.lastName;
      if (profileData.username) updateData.username = profileData.username;
      if (profileData.email) updateData.email = profileData.email;
      
      if (newPassword && currentPassword) {
        updateData.password_hash = newPassword;
      }

      const result = await db
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();

      return result;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    },
  });
}