import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export function useCurrentUser() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const data = await db.from('users').select('*').eq('id', user.id).single();
      return data.data;
    },
    enabled: !!user?.id
  });
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

      // Update profile data
      const result = await db
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();
      
      // Update password separately if provided
      if (newPassword && newPassword.trim() !== '') {
        const API_URL = import.meta.env.VITE_API_URL || 'https://erp.tolpar.com.bd/api';
        const token = sessionStorage.getItem('clowee_token');
        
        const passwordResponse = await fetch(`${API_URL}/users/${userId}/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ password: newPassword })
        });

        if (!passwordResponse.ok) {
          const errorResult = await passwordResponse.json();
          throw new Error(errorResult.error || 'Failed to update password');
        }
      }

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