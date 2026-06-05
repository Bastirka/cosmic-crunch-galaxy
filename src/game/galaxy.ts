import {
  GENERATORS, UPGRADES, generatorCost,
  type GeneratorDef, type UpgradeDef,
} from './data';
import type { GameState } from './useGame';

/**
 * ── Galaxy Map (multi-object progression) ────────────────────────────────────
 *
 * Evolves the old "Star Expansion" into a named galaxy of 5 objects. The first
 * object — Solar Core (tier 0) — IS the existing economy: its production,
 * generators, upgrades and spendable wallet are `state.stardust` /
 * `state.generators` / `state.upgrades`. Nothing about it changes.
 *
 * Objects 2+ are self-contained layers, each with its own generators, upgrades
 * and a per-object wallet (`availableEarned`).
 *
 * SOURCE-SPENDING MODEL — an earnings *waterfall*: an object's production flows
 * DOWN into itself and every LOWER-tier object's wallet (Solar Core's "wallet"
 * is `state.stardust`, credited in the tick). Each object's upgrades are paid
 * only from its own wallet, so: lower objects can never fund higher ones, while
 * higher objects always support lower ones.
 */

export type GalaxyObject = {
  id: string;
  name: string;
  unlocked: boolean;
  unlockedAt: string | null;
  productionMultiplier: number;
  upgradeCostMultiplier: number;
  lifetimeEarned: number;
  availableEarned: number;
  generators: Record<string, number>;
  upgrades: Record<string, true>;
  specialBuffs: string[];
};

export type GalaxyState = {
  activeObjectId: string;
  objects: GalaxyObject[];
};

export type GalaxyVisual = { icon: string; gradient: string; glow: string };

type GalaxyDef = {
  id: string;
  name: string;
  /** 0 = Solar Core (existing economy). */
  tier: number;
  productionMultiplier: number;
  upgradeCostMultiplier: number;
  specialBuffs: string[];
  visual: GalaxyVisual;
  /** "Reach 1Qa total Stardust", etc. */
  unlockText: string;
  /** Primary numeric goal used for the unlock progress bar (total earned). */
  unlockTarget: number;
  /** Full unlock predicate (may include alternate conditions). */
  unlock: (s: GameState) => boolean;
};

const Q = 1e15; // Quadrillion
const QI = 1e18; // Quintillion
const totalEarned = (s: GameState) => s.totalEarnedAllTime ?? 0;
const ascensions = (s: GameState) => s.ascensions ?? 0;

export const GALAXY_DEFS: GalaxyDef[] = [
  {
    id: 'solar_core', name: 'Solar Core', tier: 0, productionMultiplier: 1, upgradeCostMultiplier: 1,
    specialBuffs: ['solar_focus'],
    visual: { icon: '☀️', gradient: 'radial-gradient(circle at 35% 35%, #ffe9a8 0%, #ffb347 45%, #ff6b35 75%, #b23a1f 100%)', glow: '0 0 60px oklch(0.85 0.22 70 / 0.7), 0 0 120px oklch(0.75 0.24 40 / 0.5)' },
    unlockText: 'Starting object', unlockTarget: 0, unlock: () => true,
  },
  {
    id: 'nova_star', name: 'Nova Star', tier: 1, productionMultiplier: 2.5, upgradeCostMultiplier: 4.5,
    specialBuffs: ['nova_burst'],
    visual: { icon: '🌟', gradient: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #9fd8ff 40%, #3b82f6 75%, #1e3a8a 100%)', glow: '0 0 60px oklch(0.8 0.16 240 / 0.7), 0 0 120px oklch(0.7 0.18 250 / 0.5)' },
    unlockText: 'Reach 1Qa total Stardust', unlockTarget: 1 * Q,
    unlock: (s) => totalEarned(s) >= 1 * Q,
  },
  {
    id: 'void_star', name: 'Void Star', tier: 2, productionMultiplier: 7.5, upgradeCostMultiplier: 15,
    specialBuffs: ['void_drain'],
    visual: { icon: '🕳️', gradient: 'radial-gradient(circle at 35% 35%, #b06bdb 0%, #6d28d9 45%, #2e1065 75%, #0a0a14 100%)', glow: '0 0 60px oklch(0.5 0.22 300 / 0.7), 0 0 120px oklch(0.4 0.2 310 / 0.5)' },
    unlockText: 'Reach 100Qa total Stardust or 3 ascensions', unlockTarget: 100 * Q,
    unlock: (s) => totalEarned(s) >= 100 * Q || ascensions(s) >= 3,
  },
  {
    id: 'quantum_star', name: 'Quantum Star', tier: 3, productionMultiplier: 25, upgradeCostMultiplier: 60,
    specialBuffs: ['quantum_clicks'],
    visual: { icon: '⚛️', gradient: 'radial-gradient(circle at 35% 35%, #a5f3fc 0%, #22d3ee 40%, #ec4899 75%, #831843 100%)', glow: '0 0 60px oklch(0.8 0.16 200 / 0.7), 0 0 120px oklch(0.7 0.22 340 / 0.5)' },
    unlockText: 'Reach 1Qi total Stardust', unlockTarget: 1 * QI,
    unlock: (s) => totalEarned(s) >= 1 * QI,
  },
  {
    id: 'ancient_galaxy', name: 'Ancient Galaxy', tier: 4, productionMultiplier: 100, upgradeCostMultiplier: 250,
    specialBuffs: ['ancient_echo'],
    visual: { icon: '🌌', gradient: 'conic-gradient(from 200deg at 45% 45%, #1e1b4b, #818cf8 25%, #f0abfc 50%, #fff7d6 65%, #818cf8 85%, #1e1b4b)', glow: '0 0 60px oklch(0.7 0.18 300 / 0.7), 0 0 140px oklch(0.7 0.16 280 / 0.5)' },
    unlockText: 'Reach 10Qi total Stardust or earn the Ancient Seal achievement', unlockTarget: 10 * QI,
    unlock: (s) => totalEarned(s) >= 10 * QI || !!s.achievements?.['ancient-seal'],
  },
];

const DEF_BY_ID: Record<string, GalaxyDef> = Object.fromEntries(GALAXY_DEFS.map((d) => [d.id, d]));

export const getGalaxyVisual = (id: string): GalaxyVisual =>
  (DEF_BY_ID[id] ?? GALAXY_DEFS[0]).visual;

const tierOf = (id: string): number => DEF_BY_ID[id]?.tier ?? 0;

function makeObject(def: GalaxyDef, unlocked: boolean): GalaxyObject {
  return {
    id: def.id, name: def.name, unlocked, unlockedAt: unlocked && def.tier === 0 ? null : null,
    productionMultiplier: def.productionMultiplier, upgradeCostMultiplier: def.upgradeCostMultiplier,
    lifetimeEarned: 0, availableEarned: 0,
    generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    upgrades: {}, specialBuffs: def.specialBuffs,
  };
}

export const defaultGalaxy = (): GalaxyState => ({
  activeObjectId: 'solar_core',
  objects: GALAXY_DEFS.map((d) => makeObject(d, d.tier === 0)),
});

/** Migrate the old numeric `state.stars` shape into the named galaxy shape. */
export function legacyStarsToGalaxy(stars: unknown): Partial<GalaxyState> | null {
  const s = stars as { activeStarId?: number; ownedStars?: Array<Record<string, unknown>> } | null;
  if (!s || !Array.isArray(s.ownedStars) || s.ownedStars.length === 0) return null;
  const objects = GALAXY_DEFS.map((def, i) => {
    const old = s.ownedStars![i];
    const base = makeObject(def, def.tier === 0);
    if (!old) return base;
    return {
      ...base,
      unlocked: (old.unlocked as boolean) ?? def.tier === 0,
      unlockedAt: (old.unlockedAt as string) ?? null,
      lifetimeEarned: (old.lifetimeEarned as number) ?? 0,
      availableEarned: (old.availableEarned as number) ?? 0,
      generators: { ...base.generators, ...((old.generators as Record<string, number>) ?? {}) },
      upgrades: { ...((old.upgrades as Record<string, true>) ?? {}) },
    };
  });
  const activeIdx = (s.activeStarId ?? 1) - 1;
  return { activeObjectId: GALAXY_DEFS[activeIdx]?.id ?? 'solar_core', objects };
}

/** Coerce arbitrary saved data into a valid GalaxyState (migration-safe). */
export function normalizeGalaxy(partial: Partial<GalaxyState> | null | undefined): GalaxyState {
  const base = defaultGalaxy();
  if (!partial || !Array.isArray(partial.objects)) return base;
  const byId: Record<string, Partial<GalaxyObject>> = {};
  for (const o of partial.objects) if (o && o.id) byId[o.id] = o;
  const objects = GALAXY_DEFS.map((def) => {
    const stored = byId[def.id];
    const fresh = makeObject(def, def.tier === 0);
    if (!stored) return fresh;
    return {
      ...fresh,
      unlocked: stored.unlocked ?? def.tier === 0,
      unlockedAt: stored.unlockedAt ?? null,
      lifetimeEarned: stored.lifetimeEarned ?? 0,
      availableEarned: stored.availableEarned ?? 0,
      generators: { ...fresh.generators, ...(stored.generators ?? {}) },
      upgrades: { ...(stored.upgrades ?? {}) },
    };
  });
  objects[0].unlocked = true; // Solar Core is always unlocked
  const activeObjectId = objects.some((o) => o.id === partial.activeObjectId && o.unlocked)
    ? partial.activeObjectId!
    : 'solar_core';
  return { activeObjectId, objects };
}

// ── Lookups ──────────────────────────────────────────────────────────────────
export const getGalaxyObject = (state: GameState, id: string): GalaxyObject | undefined =>
  state.galaxy.objects.find((o) => o.id === id);

export const getActiveGalaxyObject = (state: GameState): GalaxyObject =>
  getGalaxyObject(state, state.galaxy.activeObjectId) ?? state.galaxy.objects[0];

export const unlockedCount = (state: GameState): number =>
  state.galaxy.objects.filter((o) => o.unlocked).length;

export const isObjectUnlocked = (state: GameState, id: string): boolean =>
  !!getGalaxyObject(state, id)?.unlocked;

/** Next locked object (tier order), or null if everything is unlocked. */
export function getNextGalaxyUnlock(state: GameState): GalaxyObject | null {
  return state.galaxy.objects.find((o) => !o.unlocked) ?? null;
}

export const canUnlockGalaxyObject = (state: GameState, id: string): boolean => {
  const obj = getGalaxyObject(state, id);
  const def = DEF_BY_ID[id];
  return !!obj && !!def && !obj.unlocked && def.unlock(state);
};

/** Progress toward the next unlock, for the indicator + progress bar. */
export function getGalaxyUnlockProgress(state: GameState): { object: GalaxyObject; def: GalaxyDef; current: number; target: number; ratio: number; ready: boolean } | null {
  const next = getNextGalaxyUnlock(state);
  if (!next) return null;
  const def = DEF_BY_ID[next.id];
  const current = totalEarned(state);
  const target = def.unlockTarget;
  return { object: next, def, current, target, ratio: Math.min(1, target > 0 ? current / target : 1), ready: canUnlockGalaxyObject(state, next.id) };
}

export const galaxyDef = (id: string): GalaxyDef | undefined => DEF_BY_ID[id];

// ── Production ────────────────────────────────────────────────────────────────
/** Player-wide ambient multiplier shared by every object (achievements / DM / storm). */
export function ambientGlobalMult(state: GameState): number {
  let mult = 1;
  mult *= 1 + Object.keys(state.achievements ?? {}).length * 0.01;
  mult *= 1 + (state.darkMatter ?? 0) * 0.02; // Dark Matter boosts ALL objects globally
  const stormUntil = state.activeBoosts?.cosmicStormUntil ?? null;
  if (stormUntil != null && stormUntil > Date.now()) mult *= 2;
  return mult;
}

function objectUpgradeMultipliers(obj: GalaxyObject) {
  const genMult: Record<string, number> = {};
  for (const g of GENERATORS) genMult[g.id] = 1;
  let objGlobal = 1;
  for (const u of UPGRADES) {
    if (!obj.upgrades[u.id]) continue;
    if (u.target === 'global') objGlobal *= u.mult;
    else if (genMult[u.target] != null) genMult[u.target] *= u.mult;
  }
  return { genMult, objGlobal };
}

export function galaxyGeneratorCps(obj: GalaxyObject, def: GeneratorDef, ambientMult: number): number {
  const { genMult, objGlobal } = objectUpgradeMultipliers(obj);
  return def.baseCps * (genMult[def.id] ?? 1) * objGlobal * obj.productionMultiplier * ambientMult;
}

/** Stardust/sec produced by one object (0 for Solar Core / locked). */
export function calculateGalaxyObjectProduction(obj: GalaxyObject, ambientMult: number): number {
  if (!obj.unlocked || tierOf(obj.id) === 0) return 0; // Solar Core uses the existing computeCps
  const { genMult, objGlobal } = objectUpgradeMultipliers(obj);
  let cps = 0;
  for (const g of GENERATORS) cps += (obj.generators[g.id] ?? 0) * g.baseCps * (genMult[g.id] ?? 1);
  return cps * objGlobal * obj.productionMultiplier * ambientMult;
}

/** Combined stardust/sec from every object (Solar Core passed in as base). */
export function computeGalaxyCps(state: GameState, solarCps: number): number {
  const ambient = ambientGlobalMult(state);
  let total = solarCps;
  for (const o of state.galaxy.objects) total += calculateGalaxyObjectProduction(o, ambient);
  return total;
}

/** All production waterfalls into Solar Core's pool, so one number combines all. */
export const getTotalStardustFromAllObjects = (state: GameState): number => state.stardust;

// ── Costs ─────────────────────────────────────────────────────────────────────
export const galaxyGeneratorCost = (obj: GalaxyObject, def: GeneratorDef): number =>
  generatorCost(def, obj.generators[def.id] ?? 0) * obj.upgradeCostMultiplier;

export const galaxyUpgradeCost = (obj: GalaxyObject, u: UpgradeDef): number =>
  u.cost * obj.upgradeCostMultiplier;

export const isGalaxyUpgradeVisible = (obj: GalaxyObject, u: UpgradeDef): boolean => {
  if (obj.upgrades[u.id]) return false;
  if (u.target === 'click' || u.target === 'clickSyn' || u.target === 'goldenRate' || u.target === 'goldenMult') return false;
  if (u.requires && u.target !== 'global') {
    if ((obj.generators[u.target] ?? 0) < u.requires) return false;
  }
  return true;
};

// ── Mutations (pure) ───────────────────────────────────────────────────────────
/**
 * Apply an object's per-tick production to the wallets: the producer and every
 * LOWER tier-≥1 object gets the amount in `availableEarned`; the producer also
 * banks it in `lifetimeEarned`. (Solar Core's share is added to state.stardust
 * by the caller.)
 */
export function waterfallEarnings(galaxy: GalaxyState, producerId: string, amount: number): GalaxyState {
  if (amount <= 0) return galaxy;
  const producerTier = tierOf(producerId);
  const objects = galaxy.objects.map((o) => {
    if (o.id === producerId) {
      return producerTier === 0
        ? { ...o, lifetimeEarned: o.lifetimeEarned + amount }
        : { ...o, availableEarned: o.availableEarned + amount, lifetimeEarned: o.lifetimeEarned + amount };
    }
    const t = tierOf(o.id);
    if (t < 1 || t > producerTier) return o;
    return {
      ...o,
      availableEarned: o.availableEarned + amount,
    };
  });
  return { ...galaxy, objects };
}

/** Add earnings from one object, waterfalling them to every lower-tier object. */
export function addEarningsToGalaxyObject(galaxy: GalaxyState, objectId: string, amount: number): GalaxyState {
  return waterfallEarnings(galaxy, objectId, amount);
}

export const switchGalaxyObject = (galaxy: GalaxyState, id: string): GalaxyState => {
  const target = galaxy.objects.find((o) => o.id === id);
  return target && target.unlocked ? { ...galaxy, activeObjectId: id } : galaxy;
};

/** Rule: an object can be funded only by itself or a HIGHER-tier object. */
export const canUpgradeObject = (targetObjectId: string, paymentSourceObjectId: string): boolean =>
  tierOf(paymentSourceObjectId) >= tierOf(targetObjectId);

/** Unlock an object (free once its requirement is met). Returns new GalaxyState. */
export function unlockGalaxyObject(state: GameState, id: string): GalaxyState {
  if (!canUnlockGalaxyObject(state, id)) return state.galaxy;
  const objects = state.galaxy.objects.map((o) =>
    o.id === id ? { ...o, unlocked: true, unlockedAt: new Date().toISOString() } : o,
  );
  return { activeObjectId: id, objects };
}

export function buyGalaxyGenerator(galaxy: GalaxyState, id: string, def: GeneratorDef): GalaxyState {
  const idx = galaxy.objects.findIndex((o) => o.id === id);
  if (idx < 0) return galaxy;
  const obj = galaxy.objects[idx];
  if (!obj.unlocked || tierOf(id) < 1) return galaxy;
  const cost = galaxyGeneratorCost(obj, def);
  if (obj.availableEarned < cost) return galaxy;
  const objects = [...galaxy.objects];
  objects[idx] = { ...obj, availableEarned: obj.availableEarned - cost, generators: { ...obj.generators, [def.id]: (obj.generators[def.id] ?? 0) + 1 } };
  return { ...galaxy, objects };
}

export function buyGalaxyUpgrade(galaxy: GalaxyState, id: string, u: UpgradeDef): GalaxyState {
  const idx = galaxy.objects.findIndex((o) => o.id === id);
  if (idx < 0) return galaxy;
  const obj = galaxy.objects[idx];
  if (!obj.unlocked || tierOf(id) < 1 || obj.upgrades[u.id]) return galaxy;
  const cost = galaxyUpgradeCost(obj, u);
  if (obj.availableEarned < cost) return galaxy;
  const objects = [...galaxy.objects];
  objects[idx] = { ...obj, availableEarned: obj.availableEarned - cost, upgrades: { ...obj.upgrades, [u.id]: true } };
  return { ...galaxy, objects };
}
