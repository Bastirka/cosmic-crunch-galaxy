import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export type AuthMode = 'guest' | 'cloud';

export type AuthResult = { error?: string; needsConfirmation?: boolean };

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** 'cloud' when logged in, 'guest' otherwise. */
  mode: AuthMode;
  /** False until the initial session check has completed. */
  ready: boolean;
  /** Whether Supabase env vars are present at all. */
  configured: boolean;
  /** Login modal visibility. */
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  displayName: string | null;
  email: string | null;
  getCurrentUser: () => User | null;
  registerWithEmail: (email: string, password: string) => Promise<AuthResult>;
  loginWithEmail: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Turn raw Supabase auth errors into short, friendly messages. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'That email is already registered — try logging in.';
  if (m.includes('password') && m.includes('at least')) return 'Password is too weak (use at least 6 characters).';
  if (m.includes('weak password')) return 'Password is too weak (use at least 6 characters).';
  if (m.includes('valid email') || m.includes('invalid email')) return 'Please enter a valid email address.';
  if (m.includes('email not confirmed')) return 'Please confirm your email, then log in.';
  return message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured); // ready immediately if no Supabase
  const [loginOpen, setLoginOpen] = useState(false);
  const closedOnceRef = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
      if (nextSession && !closedOnceRef.current) {
        closedOnceRef.current = true;
        setLoginOpen(false); // auto-close the modal once authenticated
      }
      if (!nextSession) closedOnceRef.current = false;
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Login is not configured.' };
    if (!email || !password) return { error: 'Enter an email and password.' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: friendlyError(error.message) };
    // If "Confirm email" is ON in Supabase, there is no session until verified.
    return { needsConfirmation: !data.session };
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Login is not configured.' };
    if (!email || !password) return { error: 'Enter an email and password.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: friendlyError(error.message) };
    return {};
  }, []);

  const logout = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('[cosmic-crunch] logout failed:', error.message);
  }, []);

  const user = session?.user ?? null;
  const getCurrentUser = useCallback(() => user, [user]);
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      mode: session ? 'cloud' : 'guest',
      ready,
      configured: isSupabaseConfigured,
      loginOpen,
      openLogin: () => setLoginOpen(true),
      closeLogin: () => setLoginOpen(false),
      displayName: (meta.display_name as string) || user?.email || null,
      email: user?.email ?? null,
      getCurrentUser,
      registerWithEmail,
      loginWithEmail,
      logout,
    }),
    [session, user, ready, loginOpen, getCurrentUser, registerWithEmail, loginWithEmail, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
