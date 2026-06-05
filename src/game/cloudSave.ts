import { supabase } from '../lib/supabase';
import { GENERATORS } from './data';
import { computeCps, type GameState } from './useGame';
import { defaultDailyRewards } from './daily';
import { defaultQuests } from './quests';
import { getDefaultCosmetics, normalizeCosmetics, mergeCosmetics } from './cosmetics';
import { DEFAULT_SOUND_SETTINGS } from '../lib/audio';
import { defaultAntiCheat, mergeAntiCheat } from './antiCheat';
import { defaultBuffs, normalizeBuffs, offlineEarningsMultiplier } from './buffs';
import {
  defaultGalaxy,
  normalizeGalaxy,
  legacyStarsToGalaxy,
  ambientGlobalMult,
  calculateGalaxyObjectProduction,
  waterfallEarnings,
  type GalaxyState,
} from './galaxy';

/** localStorage keys */
export const GUEST_SAVE_KEY = 'cosmic-crunch-save-v2';
export const GUEST_BACKUP_KEY = 'cosmicCrunch_guest_backup';

/** Offline earning tuning — mirrors the original game's behaviour. */
const OFFLINE_CAP_SECONDS = 60 * 60 * 8; // 8 hours
const OFFLINE_MIN_SECONDS = 30; // ignore very short absences

const baseState = (): GameState => ({
  stardust: 0,
  totalEarned: 0,
  totalClicks: 0,
  generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
  upgrades: {},
  achievements: {},
  goldenClicks: 0,
  ascensions: 0,
  darkMatter: 0,
  lifetimeDarkMatter: 0,
  lastAscendedAt: null,
  totalEarnedAllTime: 0,
  lastTick: Date.now(),
  dailyRewards: defaultDailyRewards(),
  randomEventsCollected: 0,
  cosmicStormUses: 0,
  blackHolesCollected: 0,
  stardustShowersCollected: 0,
  activeBoosts: { cosmicStormUntil: null },
  lastRandomEventAt: null,
  quests: defaultQuests(),
  cosmetics: getDefaultCosmetics(),
  soundSettings: { ...DEFAULT_SOUND_SETTINGS },
  antiCheat: defaultAntiCheat(),
  galaxy: defaultGalaxy(),
  buffs: defaultBuffs(),
});

/** Coerce an arbitrary parsed object into a complete, safe GameState. */
export const normalizeState = (partial: Partial<GameState> | null | undefined): GameState => {
  const base = baseState();
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    generators: { ...base.generators, ...(partial.generators ?? {}) },
    upgrades: { ...(partial.upgrades ?? {}) },
    achievements: { ...(partial.achievements ?? {}) },
    dailyRewards: { ...base.dailyRewards, ...(partial.dailyRewards ?? {}) },
    activeBoosts: { ...base.activeBoosts, ...(partial.activeBoosts ?? {}) },
    quests: partial.quests ? { ...base.quests, ...partial.quests } : base.quests,
    cosmetics: normalizeCosmetics(partial.cosmetics),
    soundSettings: { ...base.soundSettings, ...(partial.soundSettings ?? {}) },
    antiCheat: { ...base.antiCheat, ...(partial.antiCheat ?? {}) },
    galaxy: normalizeGalaxy(partial.galaxy ?? legacyStarsToGalaxy(partial.stars) ?? null),
    buffs: normalizeBuffs(partial.buffs), // drops expired temporary buffs on load
  };
};

// ─── localStorage (guest) ────────────────────────────────────────────────

export function loadGuestSave(): GameState {
  if (typeof window === 'undefined') return baseState();
  try {
    const raw = localStorage.getItem(GUEST_SAVE_KEY);
    if (!raw) return baseState();
    return normalizeState(JSON.parse(raw));
  } catch (err) {
    console.warn('[cosmic-crunch] Failed to read guest save:', err);
    return baseState();
  }
}

export function saveGuestSave(state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[cosmic-crunch] Failed to write guest save:', err);
  }
}

/** Keep a one-off backup of the guest save before it is merged into the cloud. */
export function backupGuestSave(state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_BACKUP_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[cosmic-crunch] Failed to back up guest save:', err);
  }
}

// ─── Supabase (cloud) ────────────────────────────────────────────────────
//
// The whole GameState is stored as one `save_data` JSONB blob — no per-column
// mapping. This keeps every system (quests, cosmetics, sound, anti-cheat, …)
// persisted automatically. last_active_at mirrors the in-blob lastTick so the
// row carries an at-a-glance "last seen" timestamp.

/** Load the cloud save for a user. Returns null if none exists (or on error). */
export async function loadCloudSave(userId: string): Promise<GameState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('game_saves')
    .select('save_data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[cosmic-crunch] loadCloudSave failed:', error.message);
    return null;
  }
  if (!data || !data.save_data || Object.keys(data.save_data).length === 0) return null;
  return normalizeState(data.save_data as Partial<GameState>);
}

/** Upsert the cloud save for a user (full GameState as one JSONB blob). */
export async function saveCloudSave(userId: string, state: GameState): Promise<boolean> {
  if (!supabase) return false;
  const now = new Date().toISOString();
  const { error } = await supabase.from('game_saves').upsert(
    {
      user_id: userId,
      save_data: state,
      last_active_at: new Date(state.lastTick || Date.now()).toISOString(),
      last_saved_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.warn('[cosmic-crunch] saveCloudSave failed:', error.message);
    return false;
  }
  return true;
}

/** Merge galaxy progress per object: unlocked union, max lifetime/available, max generators, union upgrades. */
function mergeGalaxy(cloud: GalaxyState, guest: GalaxyState): GalaxyState {
  const byId = new Map<string, GalaxyState['objects'][number]>();
  for (const obj of cloud.objects ?? []) byId.set(obj.id, obj);
  for (const gObj of guest.objects ?? []) {
    const cObj = byId.get(gObj.id);
    if (!cObj) {
      byId.set(gObj.id, gObj);
      continue;
    }
    const generators: Record<string, number> = { ...cObj.generators };
    for (const [id, count] of Object.entries(gObj.generators ?? {})) {
      generators[id] = Math.max(generators[id] ?? 0, count ?? 0);
    }
    byId.set(gObj.id, {
      ...cObj,
      ...gObj,
      unlocked: Boolean(cObj.unlocked || gObj.unlocked),
      unlockedAt: cObj.unlockedAt ?? gObj.unlockedAt ?? null,
      lifetimeEarned: Math.max(cObj.lifetimeEarned ?? 0, gObj.lifetimeEarned ?? 0),
      availableEarned: Math.max(cObj.availableEarned ?? 0, gObj.availableEarned ?? 0),
      generators,
      upgrades: { ...(cObj.upgrades ?? {}), ...(gObj.upgrades ?? {}) },
    });
  }
  return {
    activeObjectId:
      (guest.objects?.some((o) => o.id === guest.activeObjectId && o.unlocked) ? guest.activeObjectId : null) ??
      (cloud.objects?.some((o) => o.id === cloud.activeObjectId && o.unlocked) ? cloud.activeObjectId : null) ??
      'solar_core',
    objects: cloud.objects
      .map((obj) => byId.get(obj.id) ?? obj)
      .concat((guest.objects ?? []).filter((obj) => !cloud.objects.some((c) => c.id === obj.id))),
  };
}

/** Merge buff records: keep the more-active one's timers, union permanent unlocks. */
function pickBuffs(cloud: GameState, guest: GameState) {
  const c = cloud.buffs ?? { activeBuffs: [], unlockedPermanentBuffs: [], buffStats: { totalBuffsActivated: 0, totalSynergiesTriggered: 0, favoriteBuff: null } };
  const g = guest.buffs ?? c;
  const primary = (g.buffStats?.totalBuffsActivated ?? 0) > (c.buffStats?.totalBuffsActivated ?? 0) ? g : c;
  const unlockedPermanentBuffs = Array.from(
    new Set([...(c.unlockedPermanentBuffs ?? []), ...(g.unlockedPermanentBuffs ?? [])]),
  );
  return { ...primary, unlockedPermanentBuffs };
}

/**
 * Pure merge of a cloud save and a guest save following the project rules:
 * numeric fields take the max, collections take the union / highest count.
 */
export function mergeStates(cloud: GameState, guest: GameState): GameState {
  const generators: Record<string, number> = { ...cloud.generators };
  for (const [id, count] of Object.entries(guest.generators ?? {})) {
    generators[id] = Math.max(generators[id] ?? 0, count ?? 0);
  }
  return normalizeState({
    stardust: Math.max(cloud.stardust, guest.stardust),
    totalClicks: Math.max(cloud.totalClicks, guest.totalClicks),
    totalEarned: Math.max(cloud.totalEarned, guest.totalEarned),
    totalEarnedAllTime: Math.max(
      cloud.totalEarnedAllTime ?? 0,
      guest.totalEarnedAllTime ?? 0,
      cloud.totalEarned,
      guest.totalEarned,
    ),
    generators,
    upgrades: { ...cloud.upgrades, ...guest.upgrades },
    achievements: { ...cloud.achievements, ...guest.achievements },
    ascensions: Math.max(cloud.ascensions ?? 0, guest.ascensions ?? 0),
    darkMatter: Math.max(cloud.darkMatter ?? 0, guest.darkMatter ?? 0),
    lifetimeDarkMatter: Math.max(cloud.lifetimeDarkMatter ?? 0, guest.lifetimeDarkMatter ?? 0),
    lastAscendedAt:
      [cloud.lastAscendedAt, guest.lastAscendedAt]
        .filter(Boolean)
        .sort()
        .pop() ?? null, // most recent ascension timestamp
    goldenClicks: Math.max(cloud.goldenClicks ?? 0, guest.goldenClicks ?? 0),
    randomEventsCollected: Math.max(cloud.randomEventsCollected ?? 0, guest.randomEventsCollected ?? 0),
    cosmicStormUses: Math.max(cloud.cosmicStormUses ?? 0, guest.cosmicStormUses ?? 0),
    blackHolesCollected: Math.max(cloud.blackHolesCollected ?? 0, guest.blackHolesCollected ?? 0),
    stardustShowersCollected: Math.max(cloud.stardustShowersCollected ?? 0, guest.stardustShowersCollected ?? 0),
    activeBoosts: {
      cosmicStormUntil: Math.max(
        cloud.activeBoosts?.cosmicStormUntil ?? 0,
        guest.activeBoosts?.cosmicStormUntil ?? 0,
      ) || null,
    },
    lastRandomEventAt:
      [cloud.lastRandomEventAt, guest.lastRandomEventAt].filter(Boolean).sort().pop() ?? null,
    // Keep whichever quest record is further along (more completed quests).
    quests:
      (guest.quests?.completed_quests ?? 0) > (cloud.quests?.completed_quests ?? 0)
        ? guest.quests
        : cloud.quests,
    // Union of unlocked cosmetics; equipped from most-recent (else cloud).
    cosmetics: mergeCosmetics(cloud.cosmetics, guest.cosmetics),
    // Sound is a device/account preference — prefer the cloud's settings.
    soundSettings: cloud.soundSettings ?? guest.soundSettings,
    // Anti-cheat: never let a merge clear a flag; keep the worst counters.
    antiCheat: mergeAntiCheat(cloud.antiCheat, guest.antiCheat),
    // Keep whichever daily record has claimed more rewards (the more progressed one).
    dailyRewards:
      (guest.dailyRewards?.total_daily_claims ?? 0) > (cloud.dailyRewards?.total_daily_claims ?? 0)
        ? guest.dailyRewards
        : cloud.dailyRewards,
    // Keep the more-progressed galaxy expansion per object.
    galaxy: mergeGalaxy(cloud.galaxy, guest.galaxy),
    // Buffs: keep the record with more activations; union the permanent unlocks.
    buffs: pickBuffs(cloud, guest),
    lastTick: Math.max(cloud.lastTick ?? 0, guest.lastTick ?? 0) || Date.now(),
  });
}

/**
 * Called right after a guest logs in. Loads the guest localStorage save and the
 * existing cloud save, merges them (or uploads the guest save if no cloud save
 * exists), persists the result to Supabase, and returns the merged state.
 */
export async function mergeGuestSaveIntoCloudSave(userId: string): Promise<GameState> {
  const guest = loadGuestSave();
  // Always keep a backup of the guest save before we touch anything.
  backupGuestSave(guest);

  const cloud = await loadCloudSave(userId);
  const merged = cloud ? mergeStates(cloud, guest) : guest;

  const ok = await saveCloudSave(userId, merged);
  if (!ok) {
    console.warn('[cosmic-crunch] merge upload failed; keeping guest backup at', GUEST_BACKUP_KEY);
  }
  return merged;
}

// ─── Offline earnings ────────────────────────────────────────────────────

export type OfflineResult = {
  /** stardust earned while away (0 when no reward is due) */
  earnings: number;
  /** earnings attributed to each galaxy object (source-based wallets). */
  byObject: Record<string, number>;
  /** raw seconds since last_active_at */
  offlineSeconds: number;
  /** seconds actually rewarded (after the 8-hour cap) */
  cappedSeconds: number;
};

const NO_OFFLINE: OfflineResult = { earnings: 0, byObject: {}, offlineSeconds: 0, cappedSeconds: 0 };

/**
 * Compute offline earnings for a saved game state. Pure — does NOT mutate input.
 *
 * Formula: earnings = cps * cappedSeconds, where cappedSeconds is the away time
 * limited to 8 hours. No reward is given when:
 *   - last_active_at (lastTick) is missing
 *   - CPS is 0
 *   - the player was away for less than 30 seconds
 */
export function calculateOfflineEarnings(save: GameState): OfflineResult {
  const last = save?.lastTick;
  if (!last) return NO_OFFLINE; // last_active_at missing

  const solarCps = computeCps(save);
  const ambient = ambientGlobalMult(save);
  const offlineMult = offlineEarningsMultiplier(save);

  const offlineSeconds = Math.max(0, (Date.now() - last) / 1000);
  if (offlineSeconds < OFFLINE_MIN_SECONDS) return NO_OFFLINE; // too short

  const cappedSeconds = Math.min(offlineSeconds, OFFLINE_CAP_SECONDS);
  const byObject: Record<string, number> = {};
  const solarAmount = solarCps * cappedSeconds * offlineMult;
  let earnings = solarAmount;
  if (solarAmount > 0) byObject.solar_core = solarAmount;
  for (const obj of save.galaxy?.objects ?? []) {
    if (!obj.unlocked || obj.id === 'solar_core') continue;
    const cps = calculateGalaxyObjectProduction(obj, ambient);
    const amount = cps * cappedSeconds * offlineMult;
    if (amount > 0) {
      byObject[obj.id] = amount;
      earnings += amount;
    }
  }
  if (earnings <= 0) return NO_OFFLINE;
  return { earnings, byObject, offlineSeconds, cappedSeconds };
}

/**
 * Apply offline earnings to a save: adds earnings to stardust + total_earned,
 * and updates last_active_at (lastTick) to now so the reward cannot be claimed
 * twice. Returns a new save object (input is not mutated).
 */
export function applyOfflineEarnings(save: GameState): GameState {
  const { earnings, byObject } = calculateOfflineEarnings(save);
  let galaxy = save.galaxy;
  for (const [id, amount] of Object.entries(byObject)) galaxy = waterfallEarnings(galaxy, id, amount);
  return {
    ...save,
    galaxy,
    stardust: save.stardust + earnings,
    totalEarned: save.totalEarned + earnings,
    totalEarnedAllTime: (save.totalEarnedAllTime ?? 0) + earnings,
    lastTick: Date.now(), // mark active now — prevents duplicate rewards on refresh
  };
}

// Leaderboard logic lives in ./leaderboard.ts.
