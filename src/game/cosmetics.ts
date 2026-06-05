import type { GameState } from './useGame';

export type CosmeticCategory =
  | 'planet_skins' | 'backgrounds' | 'click_particles'
  | 'button_glows' | 'event_styles' | 'profile_badges';

export type EquippedKey =
  | 'planet_skin' | 'background' | 'click_particle'
  | 'button_glow' | 'event_style' | 'profile_badge';

export type CosmeticsState = {
  unlocked: Record<CosmeticCategory, string[]>;
  equipped: Record<EquippedKey, string>;
  /** Timestamp of the last equip — used by the login merge to break ties. */
  updated_at?: string;
};

export type CosmeticVisual = {
  gradient?: string; // planet skins (button background)
  css?: string;      // background themes (full-screen layer)
  shadow?: string;   // button glow (box-shadow)
  color?: string;    // click particle color
  icon?: string;     // particle / badge icon
};

export type CosmeticDef = {
  id: string;
  category: CosmeticCategory;
  name: string;
  preview: string;
  visual: CosmeticVisual;
  isDefault?: boolean;
  /** Returns true once the unlock condition is met. Omitted for default items. */
  unlock?: (s: GameState) => boolean;
  unlockLabel?: string;
};

export const CATEGORY_INFO: { key: CosmeticCategory; equip: EquippedKey; label: string; tab: boolean }[] = [
  { key: 'planet_skins', equip: 'planet_skin', label: 'Planet', tab: true },
  { key: 'backgrounds', equip: 'background', label: 'Background', tab: true },
  { key: 'click_particles', equip: 'click_particle', label: 'Particles', tab: true },
  { key: 'button_glows', equip: 'button_glow', label: 'Glow', tab: true },
  { key: 'profile_badges', equip: 'profile_badge', label: 'Badge', tab: true },
  { key: 'event_styles', equip: 'event_style', label: 'Events', tab: false },
];

const EQUIP_KEY: Record<CosmeticCategory, EquippedKey> = {
  planet_skins: 'planet_skin',
  backgrounds: 'background',
  click_particles: 'click_particle',
  button_glows: 'button_glow',
  event_styles: 'event_style',
  profile_badges: 'profile_badge',
};

// ─── Catalog ────────────────────────────────────────────────────────────────
export const CATALOG: CosmeticDef[] = [
  // Planet skins
  { id: 'default_planet', category: 'planet_skins', name: 'Default Planet', preview: 'The classic core', isDefault: true,
    visual: { gradient: 'radial-gradient(circle at 35% 35%, oklch(0.95 0.16 90), oklch(0.8 0.22 60) 45%, oklch(0.55 0.22 30) 75%, oklch(0.3 0.15 20) 100%)' } },
  { id: 'neon_moon', category: 'planet_skins', name: 'Neon Moon', preview: 'Glowing teal sphere',
    visual: { gradient: 'radial-gradient(circle at 35% 35%, oklch(0.95 0.12 200), oklch(0.7 0.16 200) 50%, oklch(0.4 0.12 220) 100%)' },
    unlock: (s) => s.totalClicks >= 1000, unlockLabel: 'Click 1,000 times' },
  { id: 'lava_planet', category: 'planet_skins', name: 'Lava Planet', preview: 'Molten fury',
    visual: { gradient: 'radial-gradient(circle at 35% 35%, oklch(0.9 0.18 40), oklch(0.6 0.24 30) 50%, oklch(0.35 0.18 25) 100%)' },
    unlock: (s) => (s.totalEarnedAllTime ?? 0) >= 100_000, unlockLabel: 'Reach 100K total earned' },
  { id: 'frozen_planet', category: 'planet_skins', name: 'Frozen Planet', preview: 'Icy world',
    visual: { gradient: 'radial-gradient(circle at 35% 35%, oklch(0.98 0.05 220), oklch(0.8 0.1 230) 50%, oklch(0.55 0.12 250) 100%)' },
    unlock: (s) => s.totalClicks >= 5000, unlockLabel: 'Click 5,000 times' },
  { id: 'black_hole_core', category: 'planet_skins', name: 'Black Hole Core', preview: 'Devourer of light',
    visual: { gradient: 'radial-gradient(circle at 35% 35%, oklch(0.4 0.1 300), oklch(0.18 0.06 300) 55%, oklch(0.05 0 0) 100%)' },
    unlock: (s) => (s.ascensions ?? 0) >= 1, unlockLabel: 'Ascend once' },
  { id: 'golden_star', category: 'planet_skins', name: 'Golden Star', preview: 'Pure radiance',
    visual: { gradient: 'radial-gradient(circle at 35% 35%, oklch(0.98 0.16 95), oklch(0.85 0.2 85) 45%, oklch(0.65 0.18 75) 100%)' },
    unlock: (s) => (s.goldenClicks ?? 0) >= 10, unlockLabel: 'Collect 10 Golden Comets' },

  // Backgrounds
  { id: 'deep_space', category: 'backgrounds', name: 'Deep Space', preview: 'The default void', isDefault: true,
    visual: { css: '' } },
  { id: 'purple_nebula', category: 'backgrounds', name: 'Purple Nebula', preview: 'Violet clouds',
    visual: { css: 'radial-gradient(circle at 28% 18%, oklch(0.4 0.2 320/0.45), transparent 60%), radial-gradient(circle at 75% 72%, oklch(0.35 0.18 285/0.4), transparent 55%)' },
    unlock: (s) => (s.quests?.completed_quests ?? 0) >= 5, unlockLabel: 'Complete 5 quests' },
  { id: 'blue_galaxy', category: 'backgrounds', name: 'Blue Galaxy', preview: 'Cobalt swirl',
    visual: { css: 'radial-gradient(circle at 30% 25%, oklch(0.4 0.18 250/0.45), transparent 60%), radial-gradient(circle at 78% 70%, oklch(0.45 0.16 210/0.4), transparent 55%)' },
    unlock: (s) => (s.totalEarnedAllTime ?? 0) >= 1_000_000, unlockLabel: 'Reach 1M total earned' },
  { id: 'meteor_field', category: 'backgrounds', name: 'Meteor Field', preview: 'Streaking rocks',
    visual: { css: 'linear-gradient(120deg, oklch(0.25 0.06 40/0.4), transparent 40%), radial-gradient(circle at 70% 30%, oklch(0.4 0.14 60/0.35), transparent 55%)' },
    unlock: (s) => (s.randomEventsCollected ?? 0) >= 10, unlockLabel: 'Collect 10 random events' },
  { id: 'solar_storm', category: 'backgrounds', name: 'Solar Storm', preview: 'Raging plasma',
    visual: { css: 'radial-gradient(circle at 50% 0%, oklch(0.5 0.2 50/0.5), transparent 60%), radial-gradient(circle at 20% 80%, oklch(0.45 0.22 35/0.4), transparent 55%)' },
    unlock: (s) => (s.cosmicStormUses ?? 0) >= 3, unlockLabel: 'Trigger 3 Cosmic Storms' },
  { id: 'cyber_cosmos', category: 'backgrounds', name: 'Cyber Cosmos', preview: 'Neon grid',
    visual: { css: 'radial-gradient(circle at 25% 25%, oklch(0.5 0.2 200/0.4), transparent 55%), radial-gradient(circle at 75% 75%, oklch(0.5 0.22 330/0.4), transparent 55%)' },
    unlock: (s) => (s.ascensions ?? 0) >= 2, unlockLabel: 'Ascend twice' },

  // Click particles
  { id: 'stardust_spark', category: 'click_particles', name: 'Stardust Spark', preview: 'Golden numbers', isDefault: true,
    visual: { color: 'var(--star-core)' } },
  { id: 'mini_stars', category: 'click_particles', name: 'Mini Stars', preview: '✦ sparkles',
    visual: { color: 'oklch(0.95 0.14 90)', icon: '✦' },
    unlock: (s) => s.totalClicks >= 500, unlockLabel: 'Click 500 times' },
  { id: 'neon_rings', category: 'click_particles', name: 'Neon Rings', preview: '◎ cyan glow',
    visual: { color: 'var(--nebula-cyan)', icon: '◎' },
    unlock: (s) => s.totalClicks >= 2500, unlockLabel: 'Click 2,500 times' },
  { id: 'cosmic_flames', category: 'click_particles', name: 'Cosmic Flames', preview: '🔥 fiery',
    visual: { color: 'oklch(0.75 0.2 40)', icon: '🔥' },
    unlock: (s) => (s.totalEarnedAllTime ?? 0) >= 10_000_000, unlockLabel: 'Reach 10M total earned' },
  { id: 'galaxy_dust', category: 'click_particles', name: 'Galaxy Dust', preview: '✨ pink shimmer',
    visual: { color: 'var(--nebula-pink)', icon: '✨' },
    unlock: (s) => (s.darkMatter ?? 0) >= 5, unlockLabel: 'Hold 5 Dark Matter' },

  // Button glows
  { id: 'default_glow', category: 'button_glows', name: 'Default Glow', preview: 'Warm amber', isDefault: true,
    visual: { shadow: '0 0 80px oklch(0.8 0.22 60 / 0.6), 0 0 140px oklch(0.7 0.2 40 / 0.4)' } },
  { id: 'blue_neon', category: 'button_glows', name: 'Blue Neon', preview: 'Electric blue',
    visual: { shadow: '0 0 80px oklch(0.78 0.16 220 / 0.7), 0 0 150px oklch(0.7 0.18 230 / 0.5)' },
    unlock: (s) => (s.totalEarnedAllTime ?? 0) >= 10_000, unlockLabel: 'Reach 10K total earned' },
  { id: 'purple_neon', category: 'button_glows', name: 'Purple Neon', preview: 'Violet haze',
    visual: { shadow: '0 0 80px oklch(0.7 0.22 320 / 0.7), 0 0 150px oklch(0.6 0.22 300 / 0.5)' },
    unlock: (s) => (s.quests?.completed_quests ?? 0) >= 3, unlockLabel: 'Complete 3 quests' },
  { id: 'gold_glow', category: 'button_glows', name: 'Gold Glow', preview: 'Royal gold',
    visual: { shadow: '0 0 80px oklch(0.88 0.2 90 / 0.75), 0 0 150px oklch(0.8 0.2 80 / 0.5)' },
    unlock: (s) => (s.goldenClicks ?? 0) >= 5, unlockLabel: 'Collect 5 Golden Comets' },
  { id: 'red_solar_glow', category: 'button_glows', name: 'Red Solar Glow', preview: 'Crimson burn',
    visual: { shadow: '0 0 80px oklch(0.65 0.24 30 / 0.75), 0 0 150px oklch(0.55 0.24 25 / 0.5)' },
    unlock: (s) => (s.ascensions ?? 0) >= 1, unlockLabel: 'Ascend once' },

  // Profile badges
  { id: 'new_explorer', category: 'profile_badges', name: 'New Explorer', preview: '🌱', isDefault: true,
    visual: { icon: '🌱' } },
  { id: 'comet_hunter', category: 'profile_badges', name: 'Comet Hunter', preview: '☄️',
    visual: { icon: '☄️' }, unlock: (s) => (s.goldenClicks ?? 0) >= 10, unlockLabel: 'Collect 10 Golden Comets' },
  { id: 'stardust_collector', category: 'profile_badges', name: 'Stardust Collector', preview: '💎',
    visual: { icon: '💎' }, unlock: (s) => (s.totalEarnedAllTime ?? 0) >= 1_000_000, unlockLabel: 'Reach 1M total earned' },
  { id: 'dark_matter_master', category: 'profile_badges', name: 'Dark Matter Master', preview: '🕳️',
    visual: { icon: '🕳️' }, unlock: (s) => (s.darkMatter ?? 0) >= 10, unlockLabel: 'Hold 10 Dark Matter' },
  { id: 'cosmic_legend', category: 'profile_badges', name: 'Cosmic Legend', preview: '👑',
    visual: { icon: '👑' }, unlock: (s) => (s.ascensions ?? 0) >= 5, unlockLabel: 'Ascend 5 times' },

  // Event styles (no tab — equipped silently)
  { id: 'classic_event', category: 'event_styles', name: 'Classic', preview: 'Standard events', isDefault: true,
    visual: {} },
  { id: 'rainbow_trail', category: 'event_styles', name: 'Rainbow Trail', preview: 'Prismatic events',
    visual: {}, unlock: (s) => (s.ascensions ?? 0) >= 3, unlockLabel: 'Ascend 3 times' },
];

export const getDef = (category: CosmeticCategory, id: string): CosmeticDef | undefined =>
  CATALOG.find((c) => c.category === category && c.id === id);

const CATEGORIES = CATEGORY_INFO.map((c) => c.key);

/** Build the starter cosmetics: every default item unlocked + equipped. */
export function getDefaultCosmetics(): CosmeticsState {
  const unlocked = {} as Record<CosmeticCategory, string[]>;
  const equipped = {} as Record<EquippedKey, string>;
  for (const cat of CATEGORIES) {
    const defaults = CATALOG.filter((c) => c.category === cat && c.isDefault);
    unlocked[cat] = defaults.map((c) => c.id);
    equipped[EQUIP_KEY[cat]] = defaults[0]?.id ?? '';
  }
  return { unlocked, equipped };
}

/** Ensure a (possibly partial / legacy) cosmetics object is complete and valid. */
export function normalizeCosmetics(partial?: Partial<CosmeticsState> | null): CosmeticsState {
  const base = getDefaultCosmetics();
  if (!partial) return base;
  const unlocked = {} as Record<CosmeticCategory, string[]>;
  const equipped = {} as Record<EquippedKey, string>;
  for (const cat of CATEGORIES) {
    const saved = partial.unlocked?.[cat] ?? [];
    unlocked[cat] = Array.from(new Set([...base.unlocked[cat], ...saved]));
    const eqKey = EQUIP_KEY[cat];
    const savedEq = partial.equipped?.[eqKey];
    // Keep the equipped item only if it is actually unlocked, else fall back to default.
    equipped[eqKey] = savedEq && unlocked[cat].includes(savedEq) ? savedEq : base.equipped[eqKey];
  }
  return { unlocked, equipped, updated_at: partial.updated_at };
}

export function isCosmeticUnlocked(cos: CosmeticsState, category: CosmeticCategory, id: string): boolean {
  return cos.unlocked[category]?.includes(id) ?? false;
}

export function unlockCosmetic(cos: CosmeticsState, category: CosmeticCategory, id: string): CosmeticsState {
  if (isCosmeticUnlocked(cos, category, id)) return cos;
  return { ...cos, unlocked: { ...cos.unlocked, [category]: [...cos.unlocked[category], id] } };
}

export function equipCosmetic(cos: CosmeticsState, category: CosmeticCategory, id: string): CosmeticsState {
  if (!isCosmeticUnlocked(cos, category, id)) return cos; // cannot equip a locked cosmetic
  const eqKey = EQUIP_KEY[category];
  if (cos.equipped[eqKey] === id) return cos;
  return { ...cos, equipped: { ...cos.equipped, [eqKey]: id }, updated_at: new Date().toISOString() };
}

/** Unlock any cosmetics whose conditions are now met. Pure. */
export function checkCosmeticUnlocks(state: GameState): { cosmetics: CosmeticsState; newlyUnlocked: CosmeticDef[] } {
  let cosmetics = state.cosmetics;
  const newlyUnlocked: CosmeticDef[] = [];
  for (const def of CATALOG) {
    if (!def.unlock) continue;
    if (isCosmeticUnlocked(cosmetics, def.category, def.id)) continue;
    if (def.unlock(state)) {
      cosmetics = unlockCosmetic(cosmetics, def.category, def.id);
      newlyUnlocked.push(def);
    }
  }
  return { cosmetics, newlyUnlocked };
}

/** Resolve the equipped cosmetics into their visual definitions for rendering. */
export function applyEquippedCosmetics(state: GameState) {
  const c = state.cosmetics;
  return {
    planet: getDef('planet_skins', c.equipped.planet_skin),
    background: getDef('backgrounds', c.equipped.background),
    particle: getDef('click_particles', c.equipped.click_particle),
    glow: getDef('button_glows', c.equipped.button_glow),
    badge: getDef('profile_badges', c.equipped.profile_badge),
    event: getDef('event_styles', c.equipped.event_style),
  };
}

/**
 * Merge guest + cloud cosmetics: union of unlocked items; equipped taken from
 * whichever was updated most recently (by timestamp), else preferring cloud.
 */
export function mergeCosmetics(cloud: CosmeticsState, guest: CosmeticsState): CosmeticsState {
  const unlocked = {} as Record<CosmeticCategory, string[]>;
  for (const cat of CATEGORIES) {
    unlocked[cat] = Array.from(new Set([...(cloud.unlocked[cat] ?? []), ...(guest.unlocked[cat] ?? [])]));
  }
  const guestNewer =
    guest.updated_at != null && (cloud.updated_at == null || guest.updated_at > cloud.updated_at);
  const source = guestNewer ? guest : cloud; // tie / no timestamp → prefer cloud
  return normalizeCosmetics({ unlocked, equipped: source.equipped, updated_at: source.updated_at });
}
