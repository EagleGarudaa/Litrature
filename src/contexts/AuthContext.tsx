import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInAnonymously: (username?: string) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setUser(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return { error };

    if (data.user) {
      const { error: profileError } = await supabase
        .from('player_profiles')
        .insert({
          id: data.user.id,
          username,
        });

      if (profileError) {
        return { error: profileError as unknown as AuthError };
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInAnonymously = async (username?: string): Promise<User | null> => {
    const anonymousEmail = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}@literature.game`;
    const anonymousPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const resolvedUsername = username ?? `Guest_${Math.random().toString(36).substring(2, 8)}`;

    const { data, error } = await supabase.auth.signUp({
      email: anonymousEmail,
      password: anonymousPassword,
    });

    if (error) {
      console.error('Anonymous sign-in failed:', error);
      return null;
    }

    if (data.user) {
      await supabase
        .from('player_profiles')
        .insert({
          id: data.user.id,
          username: resolvedUsername,
        });
      return data.user;
    }

    return null;
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInAnonymously, signOut }}>
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
