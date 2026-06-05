import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { formatNumber } from './data';
import { type GameState } from './useGame';

export type LeaderboardCategory =
  | 'total_earned'
  | 'stardust'
  | 'ascensions'
  | 'dark_matter'
  | 'golden_caught';

export const LEADERBOARD_CATEGORIES: { key: LeaderboardCategory; label: string }[] = [
  { key: 'total_earned', label: 'Total Earned' },
  { key: 'stardust', label: 'Stardust' },
  { key: 'ascensions', label: 'Ascensions' },
  { key: 'dark_matter', label: 'Dark Matter' },
  { key: 'golden_caught', label: 'Golden Caught' },
];

export type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  total_earned: number;
  stardust: number;
  ascensions: number;
  dark_matter: number;
  golden_caught: number;
  flagged: boolean;
  updated_at: string;
};

export const LEADERBOARD_LIMIT = 50;

/** Optional profile shape — we read display_name when present. */
type ProfileLike = { display_name?: string | null } | null | undefined;

/** Only logged-in users may write to the leaderboard. */
export function canUpdateLeaderboard(user: User | null | undefined): boolean {
  return Boolean(user && supabase);
}

/**
 * Public-safe display name:
 *   1. profile.display_name, 2. email local-part, 3. "Cosmic Player".
 *   The full email is never shown unless nothing else exists.
 */
export function getPlayerDisplayName(user: User | null | undefined, profile?: ProfileLike): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const named = profile?.display_name || (meta.display_name as string);
  if (named) return named;
  if (user?.email) return user.email.split('@')[0];
  return 'Cosmic Player';
}

/** Format a leaderboard value (handles both huge stardust counts and small ints). */
export function formatLeaderboardValue(value: number): string {
  return formatNumber(Number(value) || 0);
}

/** Fetch the top players for a category. Throws on error so the UI can show a retry state. */
export async function getLeaderboard(category: LeaderboardCategory): Promise<LeaderboardRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .order(category, { ascending: false })
    .limit(LEADERBOARD_LIMIT);
  if (error) {
    console.warn('[cosmic-crunch] getLeaderboard failed:', error.message);
    throw error;
  }
  return (data ?? []) as LeaderboardRow[];
}

/**
 * Upsert the logged-in user's leaderboard row. No-op for guests (cannot and must
 * not write). Uses onConflict so each user has exactly one row, and refreshes
 * updated_at on every save.
 */
export async function updateLeaderboardEntry(
  state: GameState,
  user: User | null | undefined,
  profile?: ProfileLike,
): Promise<void> {
  if (!canUpdateLeaderboard(user) || !user) return;
  const { error } = await supabase!.from('leaderboard_entries').upsert(
    {
      user_id: user.id,
      display_name: getPlayerDisplayName(user, profile),
      total_earned: state.totalEarnedAllTime ?? state.totalEarned,
      stardust: state.stardust,
      ascensions: state.ascensions ?? 0,
      dark_matter: state.darkMatter ?? 0,
      golden_caught: state.goldenClicks ?? 0,
      flagged: state.antiCheat?.flagged ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) console.warn('[cosmic-crunch] updateLeaderboardEntry failed:', error.message);
}
