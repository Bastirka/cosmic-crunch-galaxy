import type { GameState } from './useGame';

/**
 * ── Centralized Buff System ──────────────────────────────────────────────────
 *
 * One place that owns every temporary/permanent buff, their stacking rules,
 * safety caps and synergy combinations. Every reward path (click, CPS, offline,
 * daily, quest, event, ascension, stars) multiplies through the values produced
 * by `calculateBuffMultipliers` instead of hardcoding numbers.
 *
 * NOTE on Cosmic Storm: the legacy x2 storm boost still lives in the core
 * (`computeMultipliers` / `ambientGlobalMult`). The buff layer treats it as a
 * read-only *bridge* buff — it shows up in the UI and counts toward synergies,
 * but its x2 is NOT re-applied here (no double counting).
 */

export type BuffEffectType =
  | 'cps' | 'click' | 'generatorCost' | 'upgradeCost' | 'offline'
  | 'daily' | 'quest' | 'event' | 'golden' | 'darkMatter' | 'starProduction';

export type BuffMultipliers = {
  cps: number;
  click: number;
  generatorCost: number; // <1 = cheaper
  upgradeCost: number;
  offline: number;
  daily: number;
  quest: number;
  event: number;
  golden: number;
  darkMatter: number;
  starProduction: number;
  // Non-multiplier effects:
  critChance: number; // additive probability 0..1
  critMult: number; // crit reward multiplier
  eventSpawnChance: number; // additive (e.g. +0.25 = +25%)
  eventDuration: number; // additive seconds
  clicksDisabled: boolean;
};

export type ActiveBuff = {
  id: string;
  startedAt: string;
  expiresAt: string;
  source: string;
};

export type BuffsState = {
  activeBuffs: ActiveBuff[];
  unlockedPermanentBuffs: string[];
  buffStats: {
    totalBuffsActivated: number;
    totalSynergiesTriggered: number;
    favoriteBuff: string | null;
  };
};

/** Safety caps so synergies can't produce absurd numbers (PART 6). */
export const BUFF_CAPS = { cps: 10, click: 15, event: 20, offline: 5 } as const;

type TempBuffDef = {
  id: string;
  name: string;
  icon: string;
  durationSeconds: number;
  /** Hard cap on accumulated remaining duration when re-collected. */
  maxDurationSeconds: number;
  shortText: string;
  effects: Partial<Omit<BuffMultipliers, 'clicksDisabled'>> & { clicksDisabled?: boolean };
  /** Gate availability so strong buffs appear mid/late game (PART 8). */
  unlock: (s: GameState) => boolean;
};

type PermBuffDef = {
  id: string;
  name: string;
  icon: string;
  shortText: (s: GameState) => string;
  effect: (s: GameState) => Partial<Omit<BuffMultipliers, 'clicksDisabled'>>;
  unlock: (s: GameState) => boolean;
};

// ── Helpers to read progress safely ──────────────────────────────────────────
const ascensions = (s: GameState) => s.ascensions ?? 0;
const golden = (s: GameState) => s.goldenClicks ?? 0;
const questsDone = (s: GameState) => s.quests?.completed_quests ?? 0;
const darkMatter = (s: GameState) => s.darkMatter ?? 0;
const dailyClaims = (s: GameState) => s.dailyRewards?.total_daily_claims ?? 0;
/** Count of unlocked galaxy objects (Solar Core + any unlocked stars). */
const ownedStars = (s: GameState) => (s.galaxy?.objects ?? []).filter((o) => o.unlocked).length || 1;
/** Whether a specific galaxy object is unlocked. */
const objUnlocked = (s: GameState, id: string) => (s.galaxy?.objects ?? []).some((o) => o.id === id && o.unlocked);

// ── Temporary buff catalogue (PART 2) ─────────────────────────────────────────
export const TEMP_BUFFS: Record<string, TempBuffDef> = {
  cosmicStorm: {
    id: 'cosmicStorm', name: 'Cosmic Storm', icon: '🌩️', durationSeconds: 30, maxDurationSeconds: 60,
    shortText: '×2 CPS', effects: {}, // bridge: x2 applied by core
    unlock: () => true,
  },
  solarSurge: {
    id: 'solarSurge', name: 'Solar Surge', icon: '🔆', durationSeconds: 20, maxDurationSeconds: 40,
    shortText: '×3 click power', effects: { click: 3 },
    unlock: () => true,
  },
  nebulaLuck: {
    id: 'nebulaLuck', name: 'Nebula Luck', icon: '🍀', durationSeconds: 60, maxDurationSeconds: 120,
    shortText: '+50% event rewards', effects: { event: 1.5 },
    unlock: () => true,
  },
  goldenPulse: {
    id: 'goldenPulse', name: 'Golden Pulse', icon: '🌟', durationSeconds: 45, maxDurationSeconds: 90,
    shortText: '×2 Golden Comet rewards', effects: { golden: 2 },
    unlock: (s) => golden(s) >= 10,
  },
  hyperHarvest: {
    id: 'hyperHarvest', name: 'Hyper Harvest', icon: '🌾', durationSeconds: 60, maxDurationSeconds: 120,
    shortText: '×1.5 CPS & click', effects: { cps: 1.5, click: 1.5 },
    unlock: (s) => ascensions(s) >= 1,
  },
  starFever: {
    id: 'starFever', name: 'Star Fever', icon: '🤩', durationSeconds: 120, maxDurationSeconds: 240,
    shortText: '+25% event spawn chance', effects: { eventSpawnChance: 0.25 },
    unlock: (s) => ascensions(s) >= 1,
  },
  quantumClicks: {
    id: 'quantumClicks', name: 'Quantum Clicks', icon: '⚛️', durationSeconds: 30, maxDurationSeconds: 60,
    shortText: '10% chance ×10 click', effects: { critChance: 0.1, critMult: 10 },
    unlock: (s) => questsDone(s) >= 10,
  },
  gravityCollapse: {
    id: 'gravityCollapse', name: 'Gravity Collapse', icon: '🕳️', durationSeconds: 15, maxDurationSeconds: 30,
    shortText: '×4 generators (clicks off)', effects: { cps: 4, clicksDisabled: true },
    unlock: (s) => ownedStars(s) >= 2,
  },
  // Nova Star's special buff — a temporary click-power burst from events.
  novaBurst: {
    id: 'novaBurst', name: 'Nova Burst', icon: '💥', durationSeconds: 15, maxDurationSeconds: 30,
    shortText: '×3 click power', effects: { click: 3 },
    unlock: (s) => objUnlocked(s, 'nova_star'),
  },
};

// ── Permanent / milestone buff catalogue (PART 2) ─────────────────────────────
// These are always active once unlocked; effects are derived live from state.
export const PERM_BUFFS: Record<string, PermBuffDef> = {
  darkMatterCore: {
    id: 'darkMatterCore', name: 'Dark Matter Core', icon: '🌑',
    shortText: (s) => `+${darkMatter(s) * 2}% global (core)`,
    effect: () => ({}), // already applied by core computeMultipliers — bridge only
    unlock: (s) => darkMatter(s) >= 1,
  },
  ascendedEngine: {
    id: 'ascendedEngine', name: 'Ascended Engine', icon: '🚀',
    shortText: (s) => `+${ascensions(s)}% CPS`,
    effect: (s) => ({ cps: 1 + ascensions(s) * 0.01 }),
    unlock: (s) => ascensions(s) >= 1,
  },
  cometHunter: {
    id: 'cometHunter', name: 'Comet Hunter', icon: '☄️',
    shortText: (s) => `+${Math.floor(golden(s) / 10)}% event rewards`,
    effect: (s) => ({ event: 1 + Math.floor(golden(s) / 10) * 0.01 }),
    unlock: (s) => golden(s) >= 10,
  },
  questMastery: {
    id: 'questMastery', name: 'Quest Mastery', icon: '🎯',
    shortText: (s) => `+${Math.floor(questsDone(s) / 10)}% quest rewards`,
    effect: (s) => ({ quest: 1 + Math.floor(questsDone(s) / 10) * 0.01 }),
    unlock: (s) => questsDone(s) >= 10,
  },
  dailyStreaker: {
    id: 'dailyStreaker', name: 'Daily Streaker', icon: '📅',
    shortText: () => '+10% daily rewards',
    effect: () => ({ daily: 1.1 }),
    unlock: (s) => dailyClaims(s) >= 7,
  },
  starEmpire: {
    id: 'starEmpire', name: 'Star Empire', icon: '🌌',
    shortText: (s) => `+${ownedStars(s) * 5}% global production`,
    effect: (s) => ({ cps: 1 + ownedStars(s) * 0.05 }),
    unlock: (s) => ownedStars(s) >= 2,
  },
  primeStarLegacy: {
    id: 'primeStarLegacy', name: 'Prime Star Legacy', icon: '✨',
    shortText: (s) => `+${Math.max(0, ownedStars(s) - 1) * 3}% production`,
    effect: (s) => ({ cps: 1 + Math.max(0, ownedStars(s) - 1) * 0.03 }),
    unlock: (s) => ownedStars(s) >= 2,
  },
  // ── Galaxy object special buffs (centralized) ──────────────────────────────
  solarFocus: {
    id: 'solarFocus', name: 'Solar Focus', icon: '☀️',
    shortText: () => '+5% click power',
    effect: () => ({ click: 1.05 }),
    unlock: (s) => objUnlocked(s, 'solar_core'),
  },
  voidDrain: {
    id: 'voidDrain', name: 'Void Drain', icon: '🕳️',
    shortText: () => '+25% offline earnings',
    effect: () => ({ offline: 1.25 }),
    unlock: (s) => objUnlocked(s, 'void_star'),
  },
  quantumStarCrit: {
    id: 'quantumStarCrit', name: 'Quantum Clicks', icon: '⚛️',
    shortText: () => '5% chance ×10 click',
    effect: () => ({ critChance: 0.05, critMult: 10 }),
    unlock: (s) => objUnlocked(s, 'quantum_star'),
  },
  ancientEcho: {
    id: 'ancientEcho', name: 'Ancient Echo', icon: '🌌',
    shortText: () => '+10% all production',
    effect: () => ({ cps: 1.1 }),
    unlock: (s) => objUnlocked(s, 'ancient_galaxy'),
  },
};

// ── Synergies (PART 3) ────────────────────────────────────────────────────────
export type SynergyDef = {
  id: string;
  name: string;
  icon: string;
  requires: [string, string];
  shortText: string;
  hint: string;
  /** Extra multiplier contributions while active. */
  effect: (s: GameState) => Partial<Omit<BuffMultipliers, 'clicksDisabled'>>;
};

export const SYNERGIES: Record<string, SynergyDef> = {
  supernovaMode: {
    id: 'supernovaMode', name: 'Supernova Mode', icon: '💥', requires: ['cosmicStorm', 'solarSurge'],
    shortText: '+25% global production', hint: 'Activate Solar Surge during Cosmic Storm to trigger Supernova Mode.',
    effect: () => ({ cps: 1.25 }),
  },
  luckyCometChain: {
    id: 'luckyCometChain', name: 'Lucky Comet Chain', icon: '🎲', requires: ['goldenPulse', 'nebulaLuck'],
    shortText: 'Comets may chain a new event', hint: 'Have Golden Pulse + Nebula Luck for Lucky Comet Chain.',
    effect: () => ({}),
  },
  quantumHarvest: {
    id: 'quantumHarvest', name: 'Quantum Harvest', icon: '🌀', requires: ['hyperHarvest', 'quantumClicks'],
    shortText: 'Crits extend Hyper Harvest', hint: 'Combine Hyper Harvest + Quantum Clicks for Quantum Harvest.',
    effect: () => ({}),
  },
  stormSeason: {
    id: 'stormSeason', name: 'Storm Season', icon: '⛈️', requires: ['cosmicStorm', 'starFever'],
    shortText: 'Events last +5s', hint: 'Cosmic Storm + Star Fever triggers Storm Season.',
    effect: () => ({ eventDuration: 5 }),
  },
  darkGravity: {
    id: 'darkGravity', name: 'Dark Gravity', icon: '🌑', requires: ['gravityCollapse', 'darkMatterCore'],
    shortText: 'Dark Matter bonus doubled', hint: 'Trigger Gravity Collapse with Dark Matter for Dark Gravity.',
    effect: (s) => ({ cps: 1 + darkMatter(s) * 0.02 }), // doubles the DM global bonus
  },
  routineMaster: {
    id: 'routineMaster', name: 'Routine Master', icon: '🗓️', requires: ['dailyStreaker', 'questMastery'],
    shortText: 'Daily claim feeds a quest', hint: 'Unlock Daily Streaker + Quest Mastery for Routine Master.',
    effect: () => ({ quest: 1.05 }),
  },
  stellarNetwork: {
    id: 'stellarNetwork', name: 'Stellar Network', icon: '🛰️', requires: ['starEmpire', 'primeStarLegacy'],
    shortText: '+10% Star→Star 1 support', hint: 'Own 2+ stars for Stellar Network.',
    effect: () => ({ cps: 1.05 }),
  },
  cometSpecialist: {
    id: 'cometSpecialist', name: 'Comet Specialist', icon: '☄️', requires: ['cometHunter', 'goldenPulse'],
    shortText: 'Every 5th comet: +30s CPS', hint: 'Use Golden Pulse with Comet Hunter for Comet Specialist.',
    effect: () => ({}),
  },
};

// ── State helpers ─────────────────────────────────────────────────────────────
export const defaultBuffs = (): BuffsState => ({
  activeBuffs: [],
  unlockedPermanentBuffs: [],
  buffStats: { totalBuffsActivated: 0, totalSynergiesTriggered: 0, favoriteBuff: null },
});

/** Drop expired temporary buffs and sanitize the shape (used on load). */
export function normalizeBuffs(partial: Partial<BuffsState> | null | undefined, now = Date.now()): BuffsState {
  const base = defaultBuffs();
  if (!partial) return base;
  const activeBuffs = (partial.activeBuffs ?? []).filter(
    (b) => b && b.id && TEMP_BUFFS[b.id] && b.expiresAt && Date.parse(b.expiresAt) > now,
  );
  return {
    activeBuffs,
    unlockedPermanentBuffs: Array.isArray(partial.unlockedPermanentBuffs) ? partial.unlockedPermanentBuffs : [],
    buffStats: { ...base.buffStats, ...(partial.buffStats ?? {}) },
  };
}

export const isBuffUnlocked = (state: GameState, buffId: string): boolean => {
  const t = TEMP_BUFFS[buffId];
  if (t) return t.unlock(state);
  const p = PERM_BUFFS[buffId];
  if (p) return p.unlock(state);
  return false;
};

/** Currently-active temporary buff ids (non-expired). */
const activeTempIds = (state: GameState, now: number): Set<string> => {
  const ids = new Set<string>();
  for (const b of state.buffs?.activeBuffs ?? []) {
    if (Date.parse(b.expiresAt) > now) ids.add(b.id);
  }
  // Bridge: the legacy cosmic storm boost counts as an active buff.
  const stormUntil = state.activeBoosts?.cosmicStormUntil ?? null;
  if (stormUntil != null && stormUntil > now) ids.add('cosmicStorm');
  return ids;
};

/** Active permanent (unlocked) buff ids. */
const activePermIds = (state: GameState): Set<string> => {
  const ids = new Set<string>();
  for (const id of Object.keys(PERM_BUFFS)) if (PERM_BUFFS[id].unlock(state)) ids.add(id);
  return ids;
};

// ── Public API (PART 5) ───────────────────────────────────────────────────────

export type ActiveBuffView = {
  id: string;
  name: string;
  icon: string;
  shortText: string;
  kind: 'temp' | 'permanent';
  remainingMs?: number;
  source?: string;
};

export function getActiveBuffs(state: GameState, now = Date.now()): ActiveBuffView[] {
  const views: ActiveBuffView[] = [];
  // Temporary (from the stored list)
  for (const b of state.buffs?.activeBuffs ?? []) {
    const def = TEMP_BUFFS[b.id];
    if (!def) continue;
    const remainingMs = Date.parse(b.expiresAt) - now;
    if (remainingMs <= 0) continue;
    views.push({ id: def.id, name: def.name, icon: def.icon, shortText: def.shortText, kind: 'temp', remainingMs, source: b.source });
  }
  // Bridge cosmic storm (if not already represented in the list)
  const stormUntil = state.activeBoosts?.cosmicStormUntil ?? null;
  if (stormUntil != null && stormUntil > now && !views.some((v) => v.id === 'cosmicStorm')) {
    views.push({ id: 'cosmicStorm', name: TEMP_BUFFS.cosmicStorm.name, icon: TEMP_BUFFS.cosmicStorm.icon, shortText: TEMP_BUFFS.cosmicStorm.shortText, kind: 'temp', remainingMs: stormUntil - now, source: 'event' });
  }
  // Permanent (unlocked)
  for (const id of Object.keys(PERM_BUFFS)) {
    const def = PERM_BUFFS[id];
    if (!def.unlock(state)) continue;
    views.push({ id: def.id, name: def.name, icon: def.icon, shortText: def.shortText(state), kind: 'permanent' });
  }
  return views;
}

/** Add (or extend) a temporary buff with the stacking rules from PART 6. */
export function addBuff(buffs: BuffsState, buffId: string, durationSeconds?: number, source = 'event', now = Date.now()): BuffsState {
  const def = TEMP_BUFFS[buffId];
  if (!def) return buffs;
  const dur = (durationSeconds ?? def.durationSeconds) * 1000;
  const maxMs = def.maxDurationSeconds * 1000;
  const existing = buffs.activeBuffs.find((b) => b.id === buffId);
  let activeBuffs: ActiveBuff[];
  if (existing && Date.parse(existing.expiresAt) > now) {
    // Same buff: extend remaining time, capped (never stacks infinitely).
    const remaining = Date.parse(existing.expiresAt) - now;
    const newRemaining = Math.min(remaining + dur, maxMs);
    activeBuffs = buffs.activeBuffs.map((b) =>
      b.id === buffId ? { ...b, expiresAt: new Date(now + newRemaining).toISOString() } : b,
    );
  } else {
    const entry: ActiveBuff = {
      id: buffId,
      startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + Math.min(dur, maxMs)).toISOString(),
      source,
    };
    activeBuffs = [...buffs.activeBuffs.filter((b) => b.id !== buffId), entry];
  }
  const totalBuffsActivated = buffs.buffStats.totalBuffsActivated + 1;
  return { ...buffs, activeBuffs, buffStats: { ...buffs.buffStats, totalBuffsActivated, favoriteBuff: buffId } };
}

export const removeBuff = (buffs: BuffsState, buffId: string): BuffsState => ({
  ...buffs,
  activeBuffs: buffs.activeBuffs.filter((b) => b.id !== buffId),
});

export const refreshBuff = (buffs: BuffsState, buffId: string, durationSeconds?: number, now = Date.now()): BuffsState => {
  const def = TEMP_BUFFS[buffId];
  if (!def) return buffs;
  const dur = Math.min((durationSeconds ?? def.durationSeconds) * 1000, def.maxDurationSeconds * 1000);
  if (!buffs.activeBuffs.some((b) => b.id === buffId)) return addBuff(buffs, buffId, durationSeconds, 'refresh', now);
  return {
    ...buffs,
    activeBuffs: buffs.activeBuffs.map((b) => (b.id === buffId ? { ...b, expiresAt: new Date(now + dur).toISOString() } : b)),
  };
};

/** Extend a buff's remaining time by N seconds, capped (used by Quantum Harvest). */
export function extendBuff(buffs: BuffsState, buffId: string, addSeconds: number, hardCapSeconds: number, now = Date.now()): BuffsState {
  const existing = buffs.activeBuffs.find((b) => b.id === buffId);
  if (!existing) return buffs;
  const def = TEMP_BUFFS[buffId];
  const startedMs = Date.parse(existing.startedAt);
  const remaining = Date.parse(existing.expiresAt) - now;
  // Cap total lifetime at original duration + hardCap, and never beyond def cap.
  const maxExpires = Math.min(startedMs + (def.durationSeconds + hardCapSeconds) * 1000, now + def.maxDurationSeconds * 1000);
  const newExpires = Math.min(now + remaining + addSeconds * 1000, maxExpires);
  return {
    ...buffs,
    activeBuffs: buffs.activeBuffs.map((b) => (b.id === buffId ? { ...b, expiresAt: new Date(newExpires).toISOString() } : b)),
  };
}

/** Which synergies are currently active (both required buffs present). */
export function checkBuffSynergies(state: GameState, now = Date.now()): string[] {
  const active = new Set<string>([...activeTempIds(state, now), ...activePermIds(state)]);
  return Object.values(SYNERGIES)
    .filter((syn) => active.has(syn.requires[0]) && active.has(syn.requires[1]))
    .map((syn) => syn.id);
}

/** Hints for synergies that are one buff away from activating (PART 4 #5). */
export function getSynergyHints(state: GameState, now = Date.now()): string[] {
  const active = new Set<string>([...activeTempIds(state, now), ...activePermIds(state)]);
  const hints: string[] = [];
  for (const syn of Object.values(SYNERGIES)) {
    const [a, b] = syn.requires;
    const has = (active.has(a) ? 1 : 0) + (active.has(b) ? 1 : 0);
    if (has === 1) hints.push(syn.hint);
  }
  return hints;
}

function combine(into: BuffMultipliers, eff: Partial<BuffMultipliers>) {
  if (eff.cps != null) into.cps *= eff.cps;
  if (eff.click != null) into.click *= eff.click;
  if (eff.generatorCost != null) into.generatorCost *= eff.generatorCost;
  if (eff.upgradeCost != null) into.upgradeCost *= eff.upgradeCost;
  if (eff.offline != null) into.offline *= eff.offline;
  if (eff.daily != null) into.daily *= eff.daily;
  if (eff.quest != null) into.quest *= eff.quest;
  if (eff.event != null) into.event *= eff.event;
  if (eff.golden != null) into.golden *= eff.golden;
  if (eff.darkMatter != null) into.darkMatter *= eff.darkMatter;
  if (eff.starProduction != null) into.starProduction *= eff.starProduction;
  if (eff.critChance != null) into.critChance += eff.critChance;
  if (eff.critMult != null) into.critMult = Math.max(into.critMult, eff.critMult);
  if (eff.eventSpawnChance != null) into.eventSpawnChance += eff.eventSpawnChance;
  if (eff.eventDuration != null) into.eventDuration += eff.eventDuration;
}

/**
 * The one function every reward path uses. Combines permanent + (optionally)
 * temporary buffs + active synergies, then applies safety caps (PART 6).
 */
export function calculateBuffMultipliers(
  state: GameState,
  opts: { includeTemporary?: boolean; now?: number } = {},
): BuffMultipliers {
  const { includeTemporary = true, now = Date.now() } = opts;
  const m: BuffMultipliers = {
    cps: 1, click: 1, generatorCost: 1, upgradeCost: 1, offline: 1,
    daily: 1, quest: 1, event: 1, golden: 1, darkMatter: 1, starProduction: 1,
    critChance: 0, critMult: 1, eventSpawnChance: 0, eventDuration: 0, clicksDisabled: false,
  };

  // Permanent buffs (always active when unlocked).
  for (const id of Object.keys(PERM_BUFFS)) {
    const def = PERM_BUFFS[id];
    if (def.unlock(state)) combine(m, def.effect(state));
  }

  // Temporary buffs (from the stored list).
  if (includeTemporary) {
    for (const b of state.buffs?.activeBuffs ?? []) {
      const def = TEMP_BUFFS[b.id];
      if (!def || Date.parse(b.expiresAt) <= now) continue;
      combine(m, def.effects);
      if (def.effects.clicksDisabled) m.clicksDisabled = true;
    }
    // Active synergy bonuses.
    for (const synId of checkBuffSynergies(state, now)) combine(m, SYNERGIES[synId].effect(state));
  }

  // Safety caps.
  m.cps = Math.min(m.cps, BUFF_CAPS.cps);
  m.click = Math.min(m.click, BUFF_CAPS.click);
  m.event = Math.min(m.event, BUFF_CAPS.event);
  m.golden = Math.min(m.golden, BUFF_CAPS.event);
  m.offline = Math.min(m.offline, BUFF_CAPS.offline);
  m.critChance = Math.min(m.critChance, 1);
  return m;
}

/** Apply a single effect type to a base value. */
export const applyBuffEffects = (baseValue: number, effectType: BuffEffectType, mults: BuffMultipliers): number =>
  baseValue * (mults[effectType] ?? 1);

/** Offline earnings only ever use permanent buffs (PART 8 #10). Capped at x5. */
export function offlineEarningsMultiplier(state: GameState): number {
  const m = calculateBuffMultipliers(state, { includeTemporary: false });
  return Math.min(m.cps * m.offline, BUFF_CAPS.offline);
}

export const getBuffTooltip = (buffId: string): string => {
  const t = TEMP_BUFFS[buffId];
  if (t) return `${t.name} — ${t.shortText} (${t.durationSeconds}s)`;
  const p = PERM_BUFFS[buffId];
  if (p) return `${p.name} — permanent milestone buff`;
  return '';
};

export const getSynergyTooltip = (synergyId: string): string => {
  const s = SYNERGIES[synergyId];
  return s ? `${s.name} — ${s.shortText}` : '';
};

/** Pick the first unlocked buff from a candidate list (for granting from sources). */
export function pickGrantableBuff(state: GameState, candidates: string[]): string | null {
  const unlocked = candidates.filter((id) => isBuffUnlocked(state, id));
  if (unlocked.length === 0) return null;
  return unlocked[Math.floor(Math.random() * unlocked.length)];
}
