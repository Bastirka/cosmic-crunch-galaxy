import {
  GENERATORS, UPGRADES, generatorCost,
  type GeneratorDef, type UpgradeDef,
} from './data';
import type { GameState } from './useGame';

/**
 * ── Star Expansion (late-game multi-star layer) ──────────────────────────────
 *
 * Star 1 ("Prime Star") IS the existing economy: its production, generators,
 * upgrades and spendable wallet are `state.stardust` / `state.generators` /
 * `state.upgrades`. Nothing about Star 1 changes — these helpers never touch it
 * except through the documented waterfall below.
 *
 * Stars 2+ are a new, self-contained progression layer. Each owns its own
 * generators, upgrades and a per-star wallet (`availableEarned`).
 *
 * SOURCE-SPENDING MODEL — implemented as an earnings *waterfall*:
 *   A star's production flows DOWN to itself and every LOWER star's wallet.
 *     • Star 1's "wallet" is `state.stardust` (handled in the tick).
 *     • Star N (N≥2) production adds to the wallets of stars 2..N.
 *   Each star's own upgrades are paid only from that star's wallet.
 *
 * This makes the required rules fall out naturally:
 *   • Star 1 earnings can only upgrade Star 1 (never enter higher wallets).
 *   • Star 2 earnings upgrade Star 2 AND waterfall into Star 1 (state.stardust).
 *   • Higher stars support all lower stars; lower stars never fund higher ones.
 */

export type Star = {
  id: number;
  name: string;
  unlocked: boolean;
  /** Base production multiplier vs. Star 1 (2.5^tier). */
  productionMultiplier: number;
  /** Upgrade/generator cost multiplier vs. Star 1 (4.5^tier). */
  upgradeCostMultiplier: number;
  /** Lifetime stardust this star has produced itself. */
  lifetimeEarned: number;
  /** Spendable budget for THIS star's upgrades (own + higher-star waterfall). */
  availableEarned: number;
  generators: Record<string, number>;
  upgrades: Record<string, true>;
};

export type StarsState = {
  activeStarId: number;
  ownedStars: Star[];
};

/** Star 2 unlocks at 1 Quadrillion; each further star costs ×1000 more. */
export const STAR_UNLOCK_BASE = 1e15;
export const STAR_PRODUCTION_MULT = 2.5;
export const STAR_UPGRADE_COST_MULT = 4.5;
export const MAX_STARS = 4;

const STAR_NAMES = ['Prime Star', 'Nova Star', 'Pulsar Star', 'Quasar Star'];

export function makeStar(id: number, unlocked: boolean): Star {
  const tier = id - 1; // Star 1 → tier 0
  return {
    id,
    name: STAR_NAMES[id - 1] ?? `Star ${id}`,
    unlocked,
    productionMultiplier: Math.pow(STAR_PRODUCTION_MULT, tier),
    upgradeCostMultiplier: Math.pow(STAR_UPGRADE_COST_MULT, tier),
    lifetimeEarned: 0,
    availableEarned: 0,
    generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    upgrades: {},
  };
}

export function defaultStars(): StarsState {
  return { activeStarId: 1, ownedStars: [makeStar(1, true)] };
}

/** Coerce arbitrary saved data into a valid StarsState (migration-safe). */
export function normalizeStars(partial: Partial<StarsState> | null | undefined): StarsState {
  if (!partial || !Array.isArray(partial.ownedStars) || partial.ownedStars.length === 0) {
    return defaultStars();
  }
  const ownedStars = partial.ownedStars
    .map((s) => {
      const base = makeStar(s.id, s.unlocked ?? s.id === 1);
      return {
        ...base,
        ...s,
        generators: { ...base.generators, ...(s.generators ?? {}) },
        upgrades: { ...(s.upgrades ?? {}) },
      };
    })
    .sort((a, b) => a.id - b.id);
  const activeStarId = ownedStars.some((s) => s.id === partial.activeStarId) ? partial.activeStarId! : 1;
  return { activeStarId, ownedStars };
}

// ── Lookups ──────────────────────────────────────────────────────────────────

export const getStar = (state: GameState, starId: number): Star | undefined =>
  (state.stars?.ownedStars ?? defaultStars().ownedStars).find((s) => s.id === starId);

export const getActiveStar = (state: GameState): Star =>
  getStar(state, state.stars?.activeStarId ?? 1) ?? (state.stars?.ownedStars ?? defaultStars().ownedStars)[0];

/** The id of the next star that could be bought, or null if maxed out. */
export const nextStarId = (state: GameState): number | null => {
  const id = (state.stars?.ownedStars ?? defaultStars().ownedStars).length + 1;
  return id > MAX_STARS ? null : id;
};

/** Unlock cost for the next star (1Qa for Star 2, ×1000 each tier after). */
export const nextStarUnlockCost = (state: GameState): number | null => {
  const id = nextStarId(state);
  if (id == null) return null;
  return STAR_UNLOCK_BASE * Math.pow(1000, id - 2);
};

export const canBuyNewStar = (state: GameState): boolean => {
  const cost = nextStarUnlockCost(state);
  return cost != null && state.stardust >= cost;
};

/** Preview details for the next purchasable star (for the "Buy New Star" UI). */
export const nextStarPreview = (state: GameState) => {
  const id = nextStarId(state);
  if (id == null) return null;
  const tier = id - 1;
  return {
    id,
    name: STAR_NAMES[id - 1] ?? `Star ${id}`,
    productionMultiplier: Math.pow(STAR_PRODUCTION_MULT, tier),
    upgradeCostMultiplier: Math.pow(STAR_UPGRADE_COST_MULT, tier),
    unlockCost: nextStarUnlockCost(state)!,
  };
};

// ── Production ────────────────────────────────────────────────────────────────

/**
 * Ambient, player-wide multiplier shared by every star: achievements (+1%
 * each), Dark Matter (+2% each) and an active Cosmic Storm (×2). Per-star
 * generator/global upgrades are applied separately, per star.
 */
export function ambientGlobalMult(state: GameState): number {
  let mult = 1;
  mult *= 1 + Object.keys(state.achievements ?? {}).length * 0.01;
  mult *= 1 + (state.darkMatter ?? 0) * 0.02;
  const stormUntil = state.activeBoosts?.cosmicStormUntil ?? null;
  if (stormUntil != null && stormUntil > Date.now()) mult *= 2;
  return mult;
}

function starUpgradeMultipliers(star: Star) {
  const genMult: Record<string, number> = {};
  for (const g of GENERATORS) genMult[g.id] = 1;
  let starGlobal = 1;
  for (const u of UPGRADES) {
    if (!star.upgrades[u.id]) continue;
    if (u.target === 'global') starGlobal *= u.mult;
    else if (genMult[u.target] != null) genMult[u.target] *= u.mult; // generator-targeted
    // click/clickSyn/golden upgrades are irrelevant to a star's passive output
  }
  return { genMult, starGlobal };
}

/** Stardust/sec from one generator on a star (for shop row display). */
export function starGeneratorCps(star: Star, def: GeneratorDef, ambientMult: number): number {
  const { genMult, starGlobal } = starUpgradeMultipliers(star);
  return def.baseCps * (genMult[def.id] ?? 1) * starGlobal * star.productionMultiplier * ambientMult;
}

/** Stardust per second produced by a single star (0 for Star 1 / locked). */
export function calculateStarProduction(star: Star, ambientMult: number): number {
  if (!star.unlocked || star.id === 1) return 0; // Star 1 uses the existing computeCps
  const { genMult, starGlobal } = starUpgradeMultipliers(star);
  let cps = 0;
  for (const g of GENERATORS) cps += (star.generators[g.id] ?? 0) * g.baseCps * (genMult[g.id] ?? 1);
  return cps * starGlobal * star.productionMultiplier * ambientMult;
}

/** Combined stardust/sec flowing into the main pool from every star. */
export function computeStarsCps(state: GameState, star1Cps: number): number {
  const ambient = ambientGlobalMult(state);
  let total = star1Cps;
  for (const s of state.stars?.ownedStars ?? defaultStars().ownedStars) total += calculateStarProduction(s, ambient);
  return total;
}

/**
 * All production waterfalls into Star 1's wallet, so the single displayed
 * stardust total already combines every star.
 */
export const getTotalStardustFromAllStars = (state: GameState): number => state.stardust;

// ── Costs ─────────────────────────────────────────────────────────────────────

export const starGeneratorCost = (star: Star, def: GeneratorDef): number =>
  generatorCost(def, star.generators[def.id] ?? 0) * star.upgradeCostMultiplier;

export const starUpgradeCost = (star: Star, u: UpgradeDef): number =>
  u.cost * star.upgradeCostMultiplier;

// ── Mutations (pure — return a new StarsState / fields) ───────────────────────

/**
 * Apply a star's per-tick production to the wallets: the producing star and
 * every LOWER star (≥2) gets the amount in `availableEarned`; the producer also
 * banks it in `lifetimeEarned`. (Star 1's share is added to state.stardust by
 * the caller.) Returns a new ownedStars array, or the same ref if no-op.
 */
export function waterfallEarnings(stars: StarsState, producingId: number, amount: number): StarsState {
  if (amount <= 0) return stars;
  const ownedStars = stars.ownedStars.map((s) => {
    if (s.id < 2 || s.id > producingId) return s;
    return {
      ...s,
      availableEarned: s.availableEarned + amount,
      lifetimeEarned: s.id === producingId ? s.lifetimeEarned + amount : s.lifetimeEarned,
    };
  });
  return { ...stars, ownedStars };
}

export const switchActiveStar = (stars: StarsState, starId: number): StarsState => {
  const target = stars.ownedStars.find((s) => s.id === starId);
  return target && target.unlocked ? { ...stars, activeStarId: starId } : stars;
};

/** Rule: a star can be funded only by itself or a HIGHER star. */
export const canUpgradeStar = (targetStarId: number, paymentSourceStarId: number): boolean =>
  paymentSourceStarId >= targetStarId;

/** Buy one generator for star `starId` (≥2). Returns new StarsState or same. */
export function buyStarGenerator(stars: StarsState, starId: number, def: GeneratorDef): StarsState {
  const idx = stars.ownedStars.findIndex((s) => s.id === starId);
  if (idx < 0) return stars;
  const star = stars.ownedStars[idx];
  if (!star.unlocked || star.id < 2) return stars;
  const cost = starGeneratorCost(star, def);
  if (star.availableEarned < cost) return stars;
  const ownedStars = [...stars.ownedStars];
  ownedStars[idx] = {
    ...star,
    availableEarned: star.availableEarned - cost,
    generators: { ...star.generators, [def.id]: (star.generators[def.id] ?? 0) + 1 },
  };
  return { ...stars, ownedStars };
}

/** Buy one upgrade for star `starId` (≥2). Returns new StarsState or same. */
export function buyStarUpgrade(stars: StarsState, starId: number, u: UpgradeDef): StarsState {
  const idx = stars.ownedStars.findIndex((s) => s.id === starId);
  if (idx < 0) return stars;
  const star = stars.ownedStars[idx];
  if (!star.unlocked || star.id < 2 || star.upgrades[u.id]) return stars;
  const cost = starUpgradeCost(star, u);
  if (star.availableEarned < cost) return stars;
  const ownedStars = [...stars.ownedStars];
  ownedStars[idx] = {
    ...star,
    availableEarned: star.availableEarned - cost,
    upgrades: { ...star.upgrades, [u.id]: true },
  };
  return { ...stars, ownedStars };
}

/** Which upgrades are sensible to offer for a star (generator + global only). */
export const isStarUpgradeVisible = (star: Star, u: UpgradeDef): boolean => {
  if (star.upgrades[u.id]) return false;
  if (u.target === 'click' || u.target === 'clickSyn' || u.target === 'goldenRate' || u.target === 'goldenMult') {
    return false; // not relevant to a star's passive production
  }
  if (u.requires && u.target !== 'global') {
    if ((star.generators[u.target] ?? 0) < u.requires) return false;
  }
  return true;
};
