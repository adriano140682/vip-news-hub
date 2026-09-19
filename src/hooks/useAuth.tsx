import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: 'admin' | 'editor' | 'user';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'editor';

  useEffect(() => {
    let mounted = true;
    let profileRequest = 0;

    const loadProfile = async (userId: string) => {
      const requestId = ++profileRequest;
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!mounted || requestId !== profileRequest) return;

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        setProfile(null);
      } else if (data?.user_id !== userId) {
        console.error('Perfil retornado não corresponde ao usuário autenticado.');
        setProfile(null);
      } else {
        setProfile(data);
      }

      setLoading(false);
    };

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        void loadProfile(nextSession.user.id);
      } else {
        profileRequest += 1;
        setProfile(null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => applySession(nextSession),
    );

    supabase.auth.getSession()
      .then(async ({ data: { session: currentSession }, error }) => {
        if (error) {
          console.error('Erro ao recuperar sessão:', error);
          applySession(null);
          return;
        }
        if (!currentSession) {
          applySession(null);
          return;
        }

        const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !verifiedUser || verifiedUser.id !== currentSession.user.id) {
          console.error('Sessão Supabase não pôde ser validada:', userError || 'usuário divergente');
          await supabase.auth.signOut({ scope: 'local' });
          applySession(null);
          return;
        }
        applySession(currentSession);
      })
      .catch((error) => {
        console.error('Erro ao recuperar sessão:', error);
        applySession(null);
      });

    return () => {
      mounted = false;
      profileRequest += 1;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
