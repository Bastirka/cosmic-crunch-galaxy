import { computeCps, computeClickPower, type GameState } from './useGame';
import { formatNumber } from './data';

export type RandomEventType = 'goldenComet' | 'cosmicStorm' | 'blackHole' | 'stardustShower';

/** A spawned, on-screen event (ephemeral — never saved). */
export type ActiveRandomEvent = {
  type: RandomEventType;
  id: number;
  expiresAt: number;
  duration: number;
  /** screen position in % */
  x: number;
  y: number;
};

export const EVENT_META: Record<RandomEventType, { name: string; icon: string; glow: string }> = {
  goldenComet: { name: 'Golden Comet', icon: '☄️', glow: 'oklch(0.9 0.22 80 / 0.85)' },
  cosmicStorm: { name: 'Cosmic Storm', icon: '🌩️', glow: 'oklch(0.78 0.16 200 / 0.85)' },
  blackHole: { name: 'Black Hole', icon: '🕳️', glow: 'oklch(0.6 0.22 300 / 0.85)' },
  stardustShower: { name: 'Stardust Shower', icon: '🌟', glow: 'oklch(0.7 0.22 340 / 0.85)' },
};

// Spawn cadence + lifetimes + boost tuning.
export const SPAWN_MIN_MS = 120_000; // 2 min
export const SPAWN_MAX_MS = 300_000; // 5 min
export const EVENT_MIN_MS = 10_000;
export const EVENT_MAX_MS = 15_000;
export const STORM_DURATION_MS = 30_000;
export const STORM_MULTIPLIER = 2;
export const BLACK_HOLE_DM_CHANCE = 0.02;

export const randBetween = (min: number, max: number) => min + Math.random() * (max - min);

/** Weighted pick: Comet 40% · Shower 30% · Storm 20% · Black Hole 10%. */
export function pickEventType(): RandomEventType {
  const r = Math.random() * 100;
  if (r < 40) return 'goldenComet';
  if (r < 70) return 'stardustShower';
  if (r < 90) return 'cosmicStorm';
  return 'blackHole';
}

/** Whether a Cosmic Storm boost is currently active. */
export function isStormActive(state: GameState, now = Date.now()): boolean {
  const until = state.activeBoosts?.cosmicStormUntil ?? null;
  return until != null && until > now;
}

export type EventReward = {
  stardust: number;
  darkMatter: number;
  /** true for Cosmic Storm (activates the boost instead of granting stardust) */
  storm: boolean;
  message: string;
};

/**
 * Compute the reward for collecting an event, based on the player's current
 * progress. Pure except for Math.random (Black Hole roll). Does not mutate state.
 */
export function computeEventReward(type: RandomEventType, state: GameState): EventReward {
  const cps = computeCps(state);

  switch (type) {
    case 'goldenComet': {
      const stardust = cps > 0 ? cps * 60 : 50; // 60s of CPS, or starter
      return { stardust, darkMatter: 0, storm: false, message: `Golden Comet collected! +${formatNumber(stardust)} stardust` };
    }
    case 'stardustShower': {
      const stardust = Math.max(cps * 30 + computeClickPower(state) * 10, 50); // 30s CPS + 10 clicks
      return { stardust, darkMatter: 0, storm: false, message: `Stardust Shower! +${formatNumber(stardust)} stardust` };
    }
    case 'blackHole': {
      const minutes = randBetween(1, 5); // 1–5 minutes of CPS
      const stardust = Math.max(cps * 60 * minutes, 100);
      const ascensionUnlocked = (state.ascensions ?? 0) > 0;
      const darkMatter = ascensionUnlocked && Math.random() < BLACK_HOLE_DM_CHANCE ? 1 : 0;
      const message = darkMatter
        ? `Black Hole captured! +${formatNumber(stardust)} stardust +1 Dark Matter`
        : `Black Hole captured! +${formatNumber(stardust)} stardust`;
      return { stardust, darkMatter, storm: false, message };
    }
    case 'cosmicStorm':
    default:
      return { stardust: 0, darkMatter: 0, storm: true, message: 'Cosmic Storm activated! x2 production for 30s' };
  }
}
