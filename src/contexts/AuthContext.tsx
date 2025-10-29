import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/integrations/postgres/client';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSpectator: boolean;
  canEdit: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('clowee_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData.user);
      setUserRole(userData.role);
    }
    setLoading(false);
  }, []);

  const fetchUserRole = async (email: string) => {
    try {
      const { data } = await db
        .from('users')
        .select('role')
        .eq('email', email)
        .single();

      setUserRole(data?.role || 'user');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('user');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://202.59.208.112:3008/api';
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Invalid credentials');
      }
      
      const userData = result.data;
      const mockUser = { id: userData.id, email: userData.email } as User;
      setUser(mockUser);
      setUserRole(userData.role);
      
      localStorage.setItem('clowee_user', JSON.stringify({
        user: mockUser,
        role: userData.role
      }));
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem('clowee_user');
    setUser(null);
    setUserRole(null);
  };

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const isSpectator = userRole === 'spectator';
  const canEdit = !isSpectator;

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      loading,
      signIn,
      signOut,
      isAdmin,
      isSpectator,
      canEdit,
      isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}