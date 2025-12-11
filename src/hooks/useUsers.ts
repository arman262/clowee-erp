import { useState, useEffect } from "react";
import { db } from "@/integrations/postgres/client";
import { createNotification } from "./useNotifications";



export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await db
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .execute();

      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userData: { name: string; email: string; password: string; role: string }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://erp.tolpar.com.bd/api';
    const token = sessionStorage.getItem('clowee_token');
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role
      })
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to create user via API');
    }

    await fetchUsers();

    const storedUser = sessionStorage.getItem('clowee_user');
    const userId = storedUser ? JSON.parse(storedUser).user.id : null;
    await createNotification('Success', `New user ${userData.name || userData.email} created`, 'Users', userId);
  };

  const updateUser = async (id: string, userData: { name: string; email: string; password: string; role: string }) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://erp.tolpar.com.bd/api';
      const token = sessionStorage.getItem('clowee_token');

      // Update user details
      await db
        .from("users")
        .update({
          name: userData.name,
          email: userData.email,
          role: userData.role
        })
        .eq("id", id);

      // Update password if provided
      if (userData.password && userData.password.trim() !== '') {
        console.log('[Password Update] Calling password update endpoint for user:', id);
        const passwordResponse = await fetch(`${API_URL}/users/${id}/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ password: userData.password })
        });

        console.log('[Password Update] Response status:', passwordResponse.status);
        
        if (!passwordResponse.ok) {
          const result = await passwordResponse.json();
          console.error('[Password Update] Failed:', result);
          throw new Error(result.error || 'Failed to update password');
        }
        
        console.log('[Password Update] Success');
      }

      await fetchUsers();

      const storedUser = sessionStorage.getItem('clowee_user');
      const userId = storedUser ? JSON.parse(storedUser).user.id : null;
      await createNotification('Info', `User ${userData.name || userData.email} updated`, 'Users', userId);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    const userToDelete = users.find(u => u.id === id);

    await db
      .from("users")
      .delete()
      .eq("id", id)
      .execute();

    setUsers(prev => prev.filter(user => user.id !== id));

    const storedUser = sessionStorage.getItem('clowee_user');
    const userId = storedUser ? JSON.parse(storedUser).user.id : null;
    await createNotification('Warning', `User ${userToDelete?.name || userToDelete?.email} deleted`, 'Users', userId);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    addUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers
  };
}