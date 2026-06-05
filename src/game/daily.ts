import { computeCps, type GameState } from './useGame';

/** Reward size per streak day, expressed in minutes-worth of the player's CPS. */
export const DAILY_MINUTES = [5, 10, 15, 30, 60, 120, 240] as const;
export const MAX_STREAK = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const RESET_MS = 48 * 60 * 60 * 1000; // miss >48h → streak resets

export type DailyRewards = {
  daily_streak: number;
  last_daily_claim_at: string | null;
  total_daily_claims: number;
};

export const defaultDailyRewards = (): DailyRewards => ({
  daily_streak: 0,
  last_daily_claim_at: null,
  total_daily_claims: 0,
});

export type DailyStatus = {
  /** true when a reward can be claimed right now */
  canClaim: boolean;
  /** the day (1..7) that would be granted on the next claim */
  claimDay: number;
  /** number of days already completed in the current cycle (for the UI) */
  completed: number;
  /** ms until the next claim becomes available (0 when canClaim) */
  msUntilNext: number;
  /** true when the upcoming claim restarts the streak (missed >48h) */
  willReset: boolean;
};

/**
 * Derive the current daily-reward status from the saved fields. Pure.
 *
 * - First claim ever, or after a >48h gap → claimDay 1 (streak restart).
 * - <24h since last claim → already claimed, locked with a countdown.
 * - 24–48h since last claim → claimable, advances the streak (loops 7→1).
 */
export function getDailyStatus(d: DailyRewards, now = Date.now()): DailyStatus {
  const last = d.last_daily_claim_at ? Date.parse(d.last_daily_claim_at) : NaN;
  const streak = d.daily_streak ?? 0;
  const nextDay = streak >= MAX_STREAK ? 1 : streak + 1;

  if (!d.last_daily_claim_at || Number.isNaN(last)) {
    return { canClaim: true, claimDay: 1, completed: 0, msUntilNext: 0, willReset: false };
  }

  const elapsed = now - last;
  if (elapsed < DAY_MS) {
    return { canClaim: false, claimDay: nextDay, completed: streak, msUntilNext: DAY_MS - elapsed, willReset: false };
  }
  if (elapsed >= RESET_MS) {
    return { canClaim: true, claimDay: 1, completed: 0, msUntilNext: 0, willReset: true };
  }
  return { canClaim: true, claimDay: nextDay, completed: streak, msUntilNext: 0, willReset: false };
}

export type DailyReward = { stardust: number; darkMatter: number; minutes: number };

/**
 * Reward for a given streak day, scaled to the player's current CPS so it stays
 * relevant late-game. If CPS is 0, a small flat starter reward is given instead.
 * Day 7 also grants 1 Dark Matter once the player has unlocked ascension.
 */
export function computeDailyReward(state: GameState, day: number): DailyReward {
  const minutes = DAILY_MINUTES[Math.min(Math.max(day, 1), MAX_STREAK) - 1];
  const cps = computeCps(state);
  let stardust = cps * minutes * 60;
  if (stardust <= 0) stardust = minutes * 10; // starter reward when CPS is 0
  const darkMatter = day === MAX_STREAK && (state.ascensions ?? 0) > 0 ? 1 : 0;
  return { stardust, darkMatter, minutes };
}

/** Human-readable countdown, e.g. "3h 12m" or "0h 45m". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${m}m`;
}
