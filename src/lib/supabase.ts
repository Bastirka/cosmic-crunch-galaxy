import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Auth is email/password only — no OAuth providers.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both public env vars are present. When false the game runs in guest-only mode. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[cosmic-crunch] Supabase is not configured. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY in your .env to enable login & cloud saves. ' +
      'The game will run in guest-only (localStorage) mode.',
  );
}

/**
 * The Supabase browser client. Only created in the browser — the auth client
 * persists the session in localStorage, which does not exist during SSR.
 * `null` when not configured or when running on the server.
 *
 * SECURITY: only the public anon key is ever used here. Never import or expose
 * the service-role key in frontend code.
 */
export const supabase: SupabaseClient | null =
  isSupabaseConfigured && typeof window !== 'undefined'
    ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
