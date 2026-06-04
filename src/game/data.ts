export type GeneratorDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  baseCost: number;
  baseCps: number;
};

export type UpgradeDef = {
  id: string;
  name: string;
  desc: string;
  cost: number;
  target: string;
  mult: number;
  requires?: number;
  /** also requires N total clicks */
  requiresClicks?: number;
};

export type AchievementDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** returns true when unlocked */
  check: (s: import('./useGame').GameState) => boolean;
};

export const GENERATORS: GeneratorDef[] = [
  { id: 'probe', name: 'Stardust Probe', desc: 'A tiny drone scooping particles.', icon: '🛰️', baseCost: 15, baseCps: 0.1 },
  { id: 'miner', name: 'Asteroid Miner', desc: 'Cracks open asteroids for raw stardust.', icon: '⛏️', baseCost: 100, baseCps: 1 },
  { id: 'comet', name: 'Comet Harvester', desc: 'Rides comet tails for cosmic residue.', icon: '☄️', baseCost: 1100, baseCps: 8 },
  { id: 'nebula', name: 'Nebula Refinery', desc: 'Refines glittering nebula gas.', icon: '🌫️', baseCost: 12_000, baseCps: 47 },
  { id: 'pulsar', name: 'Pulsar Forge', desc: 'Harnesses pulsar beams into stardust.', icon: '💫', baseCost: 130_000, baseCps: 260 },
  { id: 'wormhole', name: 'Wormhole Siphon', desc: 'Pulls stardust through folded spacetime.', icon: '🌀', baseCost: 1_400_000, baseCps: 1400 },
  { id: 'galaxy', name: 'Galaxy Compressor', desc: 'Squeezes a galaxy until it weeps stardust.', icon: '🌌', baseCost: 20_000_000, baseCps: 7800 },
  { id: 'singularity', name: 'Singularity Engine', desc: 'A tame black hole that never stops giving.', icon: '⚫', baseCost: 330_000_000, baseCps: 44_000 },
  { id: 'quasar', name: 'Quasar Reactor', desc: 'Bottles a quasar for limitless light.', icon: '✨', baseCost: 5_100_000_000, baseCps: 260_000 },
  { id: 'multiverse', name: 'Multiverse Tap', desc: 'Draws stardust from parallel realities.', icon: '🪐', baseCost: 75_000_000_000, baseCps: 1_600_000 },
  { id: 'godshard', name: 'God-Shard Furnace', desc: 'Melts pieces of forgotten gods.', icon: '🔥', baseCost: 1_000_000_000_000, baseCps: 10_000_000 },
  { id: 'cosmos', name: 'The Cosmos Itself', desc: 'You are the universe harvesting yourself.', icon: '♾️', baseCost: 14_000_000_000_000, baseCps: 65_000_000 },
];

// Hand-curated click + global upgrades
const HAND_UPGRADES: UpgradeDef[] = [
  { id: 'click1', name: 'Reinforced Gloves', desc: '+1 stardust per click.', cost: 100, target: 'click', mult: 2 },
  { id: 'click2', name: 'Plasma Gauntlet', desc: 'Click power x3.', cost: 5_000, target: 'click', mult: 3 },
  { id: 'click3', name: 'Quantum Touch', desc: 'Click power x5.', cost: 250_000, target: 'click', mult: 5 },
  { id: 'click4', name: 'Hand of the Void', desc: 'Click power x10.', cost: 50_000_000, target: 'click', mult: 10 },
  { id: 'click5', name: 'Stellar Crusher', desc: 'Click power x10.', cost: 5_000_000_000, target: 'click', mult: 10 },
  { id: 'click6', name: 'Godfinger', desc: 'Click power x20.', cost: 1_000_000_000_000, target: 'click', mult: 20 },
  { id: 'clickSyn1', name: 'Kinetic Resonance', desc: 'Clicks gain +1% of your CPS (was +1%, now +2%).', cost: 1_000_000, target: 'clickSyn', mult: 2 },
  { id: 'clickSyn2', name: 'Newton\'s Whisper', desc: 'Clicks gain +5% of your CPS.', cost: 100_000_000, target: 'clickSyn', mult: 5 },

  { id: 'g1', name: 'Cosmic Synergy', desc: 'All production +25%.', cost: 1_000_000, target: 'global', mult: 1.25 },
  { id: 'g2', name: 'Dark Matter Lens', desc: 'All production x2.', cost: 100_000_000, target: 'global', mult: 2 },
  { id: 'g3', name: 'Cosmic Web', desc: 'All production x2.', cost: 10_000_000_000, target: 'global', mult: 2 },
  { id: 'g4', name: 'Heat Death Bypass', desc: 'All production x3.', cost: 1_000_000_000_000, target: 'global', mult: 3 },
  { id: 'g5', name: 'The Source', desc: 'All production x5.', cost: 100_000_000_000_000, target: 'global', mult: 5 },

  { id: 'golden1', name: 'Lucky Halo', desc: 'Golden stars appear twice as often.', cost: 77_777_777, target: 'goldenRate', mult: 2 },
  { id: 'golden2', name: 'Midas Lens', desc: 'Golden stars give 2x bonus.', cost: 7_777_777_777, target: 'goldenMult', mult: 2 },
];

// Auto-generate milestone tier upgrades for each generator
// Mirrors Cookie Clicker's "Owned N of X" upgrades.
const TIER_STEPS: Array<{ owned: number; mult: number; costMult: number; label: string }> = [
  { owned: 1, mult: 2, costMult: 10, label: 'Mk II' },
  { owned: 5, mult: 2, costMult: 50, label: 'Mk III' },
  { owned: 25, mult: 2, costMult: 500, label: 'Mk IV' },
  { owned: 50, mult: 2, costMult: 5_000, label: 'Mk V' },
  { owned: 100, mult: 2, costMult: 50_000, label: 'Apex' },
  { owned: 150, mult: 2, costMult: 500_000, label: 'Zenith' },
  { owned: 200, mult: 2, costMult: 5_000_000, label: 'Transcendent' },
];

const tierUpgrades: UpgradeDef[] = GENERATORS.flatMap((g) =>
  TIER_STEPS.map((t, i) => ({
    id: `${g.id}-t${i}`,
    name: `${g.name} ${t.label}`,
    desc: `${g.name}s are twice as productive.`,
    cost: Math.ceil(g.baseCost * t.costMult),
    target: g.id,
    mult: t.mult,
    requires: t.owned,
  })),
);

export const UPGRADES: UpgradeDef[] = [...HAND_UPGRADES, ...tierUpgrades];

// ─── Achievements ────────────────────────────────────────────────────
const stardustTiers = [
  { n: 1_000, name: 'A Pinch of Stardust', icon: '🌟' },
  { n: 1_000_000, name: 'Cosmic Pantry', icon: '🥣' },
  { n: 1_000_000_000, name: 'Stellar Hoarder', icon: '💎' },
  { n: 1_000_000_000_000, name: 'Galactic Tycoon', icon: '👑' },
  { n: 1e15, name: 'Master of Reality', icon: '🪄' },
];
const clickTiers = [
  { n: 100, name: 'Tap, Tap', icon: '👆' },
  { n: 1_000, name: 'Click Apprentice', icon: '🖱️' },
  { n: 10_000, name: 'Carpal Tunnel', icon: '🩹' },
  { n: 100_000, name: 'Click Deity', icon: '⚡' },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  ...stardustTiers.map((t) => ({
    id: `dust-${t.n}`,
    name: t.name,
    desc: `Earn ${formatNumberStatic(t.n)} stardust total.`,
    icon: t.icon,
    check: (s: import('./useGame').GameState) => s.totalEarned >= t.n,
  })),
  ...clickTiers.map((t) => ({
    id: `click-${t.n}`,
    name: t.name,
    desc: `Click ${t.n.toLocaleString()} times.`,
    icon: t.icon,
    check: (s: import('./useGame').GameState) => s.totalClicks >= t.n,
  })),
  ...GENERATORS.flatMap((g) =>
    [1, 50, 100, 200].map((n) => ({
      id: `gen-${g.id}-${n}`,
      name: `${g.name} ×${n}`,
      desc: `Own ${n} ${g.name}${n > 1 ? 's' : ''}.`,
      icon: g.icon,
      check: (s: import('./useGame').GameState) => (s.generators[g.id] ?? 0) >= n,
    })),
  ),
  {
    id: 'golden-1',
    name: 'Lucky Catch',
    desc: 'Click a golden star.',
    icon: '🌠',
    check: (s) => (s.goldenClicks ?? 0) >= 1,
  },
  {
    id: 'golden-10',
    name: 'Fortune Favors',
    desc: 'Click 10 golden stars.',
    icon: '🍀',
    check: (s) => (s.goldenClicks ?? 0) >= 10,
  },
  {
    id: 'ascend-1',
    name: 'Reborn in Starlight',
    desc: 'Ascend for the first time.',
    icon: '🕉️',
    check: (s) => (s.ascensions ?? 0) >= 1,
  },
];

export const generatorCost = (def: GeneratorDef, owned: number) =>
  Math.ceil(def.baseCost * Math.pow(1.15, owned));

function formatNumberStatic(n: number): string {
  return formatNumber(n);
}

export const formatNumber = (n: number): string => {
  if (n < 1000) return n.toFixed(n < 10 && n % 1 !== 0 ? 1 : 0);
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + units[i];
};

// Dark Matter (prestige) helpers — Cookie Clicker-style cube-root curve
export const darkMatterFor = (totalEarned: number) => {
  if (totalEarned < 1e12) return 0;
  return Math.floor(Math.cbrt(totalEarned / 1e12) * 10);
};

export const ASCEND_THRESHOLD = 1e12;