import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
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

  const fetchUserRole = async (userId: string) => {
    try {
      // Get user email from auth user
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user?.email) return;

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', authUser.user.email)
        .single();

      if (error) throw error;
      setUserRole(data?.role || 'user');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('user');
    }
  };

  const signIn = async (email: string, password: string) => {
    // Simple password check for now
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', password)
      .single();

    if (error || !userData) {
      throw new Error('Invalid credentials');
    }
    
    // Create a mock session
    const mockUser = { id: userData.id, email: email } as User;
    setUser(mockUser);
    setUserRole(userData.role);
    
    // Store in localStorage
    localStorage.setItem('clowee_user', JSON.stringify({
      user: mockUser,
      role: userData.role
    }));
  };

  const signOut = async () => {
    localStorage.removeItem('clowee_user');
    setUser(null);
    setUserRole(null);
  };

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      loading,
      signIn,
      signOut,
      isAdmin
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