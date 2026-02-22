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

  // Cache to avoid refetching role unnecessarily
  const roleCache = React.useRef<{ userId: string; role: 'admin' | 'user' | 'driver' | null } | null>(null);

  const fetchUserRole = async (userId: string) => {
    // Return cached role if available
    if (roleCache.current?.userId === userId) {
      return roleCache.current.role;
    }

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

      const role = data?.role as 'admin' | 'user' | 'driver' | null;
      // Cache the result
      roleCache.current = { userId, role };
      return role;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // If session expired/invalid, try to recover before logging out
        if (!session && (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED')) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data.session && isMounted) {
              setSession(data.session);
              setUser(data.session.user);
              const role = await fetchUserRole(data.session.user.id);
              if (isMounted) setUserRole(role);
              return;
            }
          } catch {
            // Recovery failed, proceed with logout
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch role only for new sessions
        if (session?.user && event !== 'TOKEN_REFRESHED') {
          const role = await fetchUserRole(session.user.id);
          if (isMounted) setUserRole(role);
        } else if (!session) {
          setUserRole(null);
          roleCache.current = null; // Clear cache on logout
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        if (isMounted) setUserRole(role);
      }
      
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
    
    // Clear local state first for immediate UI update
    setUser(null);
    setSession(null);
    setUserRole(null);
    
    try {
      // Then sign out from Supabase
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      // Even if server call fails (e.g., session already expired), we already cleared local state
      console.log('Sign out server call failed, but local state is cleared');
    }
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
