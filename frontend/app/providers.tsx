'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) {
        apiClient.setAuthToken(session.access_token);
        // Store user info in localStorage
        localStorage.setItem('user', JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          persona: 'ae'
        }));
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        apiClient.setAuthToken(session.access_token);
        // Store user info when auth state changes (e.g., after OAuth redirect)
        localStorage.setItem('user', JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          persona: 'ae'
        }));
        
        // Handle sign in event - redirect to dashboard
        if (event === 'SIGNED_IN') {
          router.push('/dashboard');
        }
      } else {
        apiClient.setAuthToken('');
        localStorage.removeItem('user');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within Providers');
  }
  return context;
};