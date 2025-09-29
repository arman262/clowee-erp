import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userData: { name: string; email: string; password: string; role: string }) => {
    const { data, error } = await supabase
      .from("users")
      .insert([{
        name: userData.name,
        email: userData.email,
        password_hash: userData.password, // Store plain text for now
        role: userData.role
      }])
      .select()
      .single();

    if (error) throw error;
    setUsers(prev => [data, ...prev]);
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

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    setUsers(prev => prev.map(user => user.id === id ? data : user));
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setUsers(prev => prev.filter(user => user.id !== id));
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