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
    const { data } = await db
      .from("users")
      .insert({
        name: userData.name,
        email: userData.email,
        password_hash: userData.password, // Store plain text for now
        role: userData.role
      })
      .select()
      .single();

    setUsers(prev => [data, ...prev]);
    
    const storedUser = localStorage.getItem('clowee_user');
    const userId = storedUser ? JSON.parse(storedUser).user.id : null;
    await createNotification('Success', `New user ${userData.name || userData.email} created`, 'Users', userId);
    
    return data;
  };

  const updateUser = async (id: string, userData: { name: string; email: string; password: string; role: string }) => {
    let updateData: any = {
      name: userData.name,
      email: userData.email,
      role: userData.role
    };

    if (userData.password && userData.password.trim() !== '') {
      updateData.password_hash = userData.password; // Store plain text for now
    }

    const { data } = await db
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    setUsers(prev => prev.map(user => user.id === id ? data : user));
    
    const storedUser = localStorage.getItem('clowee_user');
    const userId = storedUser ? JSON.parse(storedUser).user.id : null;
    await createNotification('Info', `User ${userData.name || userData.email} updated`, 'Users', userId);
  };

  const deleteUser = async (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    
    await db
      .from("users")
      .delete()
      .eq("id", id)
      .execute();

    setUsers(prev => prev.filter(user => user.id !== id));
    
    const storedUser = localStorage.getItem('clowee_user');
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