import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { mongodb } from '@/lib/mongodb';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  xp: number;
  current_streak: number;
  longest_streak: number;
  daily_xp: number;
  daily_xp_goal: number;
  last_login_date: string;
  last_xp_reset_date: string;
  last_quiz_date: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MongoAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    const { data, error } = await mongodb.verifyToken(token);
    if (error || !data?.user) {
      localStorage.removeItem('auth_token');
      setUser(null);
    } else {
      setUser(data.user);
    }
    setLoading(false);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const { data } = await mongodb.verifyToken(token);
    if (data?.user) {
      setUser(data.user);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await mongodb.register(email, password, name);
    
    if (error) {
      return { error };
    }

    // Auto login after signup
    const loginResult = await signIn(email, password);
    return loginResult;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await mongodb.login(email, password);
    
    if (error) {
      return { error };
    }

    if (data?.token) {
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
    }
    
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    toast({ title: "Logged out successfully" });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useMongoAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useMongoAuth must be used within MongoAuthProvider');
  }
  return context;
};

// Hook to check if user is admin
export const useMongoAdmin = () => {
  const { user, loading } = useMongoAuth();
  return {
    isAdmin: user?.role === 'admin',
    loading
  };
};
