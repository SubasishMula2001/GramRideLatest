import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/hooks/useActivityLog';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: 'user' | 'driver') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  userRole: 'admin' | 'user' | 'driver' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'driver' | null>(null);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as 'admin' | 'user' | 'driver' | null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If session expired/invalid, try to recover before logging out
        if (!session && (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED')) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              // Session recovered, use it
              setSession(data.session);
              setUser(data.session.user);
              setTimeout(() => {
                fetchUserRole(data.session!.user.id).then(setUserRole);
              }, 0);
              return;
            }
          } catch {
            // Recovery failed, proceed with logout
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setUserRole);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(setUserRole);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'user' | 'driver' = 'user') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role, // Pass the selected role to the database trigger
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Log successful login
    if (!error && data?.user) {
      logActivity({
        userId: data.user.id,
        action: 'User Login',
        details: { method: 'email', email }
      });
    }
    
    return { error: error as Error | null };
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    
    return { error: error as Error | null };
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    
    // Log successful phone login
    if (!error && data?.user) {
      logActivity({
        userId: data.user.id,
        action: 'User Login',
        details: { method: 'phone', phone }
      });
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Log logout before clearing state
    if (user) {
      await logActivity({
        userId: user.id,
        action: 'User Logout',
        details: { email: user.email }
      });
    }
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Even if server call fails (e.g., session already expired), continue with local cleanup
      console.log('Sign out server call failed, cleaning up local state');
    }
    // Always clear local state regardless of server response
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithPhone,
      verifyPhoneOtp,
      signOut,
      userRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
