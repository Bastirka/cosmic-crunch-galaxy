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
  /** generator id this multiplies, or 'click' for click power, or 'global' */
  target: string;
  /** multiplier applied to target output */
  mult: number;
  /** required count of the target generator (0 for click/global) */
  requires?: number;
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
];

export const UPGRADES: UpgradeDef[] = [
  { id: 'click1', name: 'Reinforced Gloves', desc: '+1 stardust per click.', cost: 100, target: 'click', mult: 2 },
  { id: 'click2', name: 'Plasma Gauntlet', desc: 'Click power x3.', cost: 5_000, target: 'click', mult: 3 },
  { id: 'click3', name: 'Quantum Touch', desc: 'Click power x5.', cost: 250_000, target: 'click', mult: 5 },
  { id: 'click4', name: 'Hand of the Void', desc: 'Click power x10.', cost: 50_000_000, target: 'click', mult: 10 },

  { id: 'probe1', name: 'Probe Mk II', desc: 'Probes are twice as fast.', cost: 100, target: 'probe', mult: 2, requires: 1 },
  { id: 'probe2', name: 'Probe Mk III', desc: 'Probes x2.', cost: 1_000, target: 'probe', mult: 2, requires: 10 },
  { id: 'probe3', name: 'AI Swarm', desc: 'Probes x3.', cost: 100_000, target: 'probe', mult: 3, requires: 25 },

  { id: 'miner1', name: 'Diamond Drills', desc: 'Miners x2.', cost: 1_000, target: 'miner', mult: 2, requires: 1 },
  { id: 'miner2', name: 'Antimatter Charges', desc: 'Miners x2.', cost: 11_000, target: 'miner', mult: 2, requires: 10 },
  { id: 'miner3', name: 'Gravitic Crushers', desc: 'Miners x3.', cost: 1_000_000, target: 'miner', mult: 3, requires: 25 },

  { id: 'comet1', name: 'Ion Nets', desc: 'Comet Harvesters x2.', cost: 11_000, target: 'comet', mult: 2, requires: 1 },
  { id: 'comet2', name: 'Tail Resonators', desc: 'Comet Harvesters x2.', cost: 120_000, target: 'comet', mult: 2, requires: 10 },

  { id: 'nebula1', name: 'Cryo Distillers', desc: 'Nebula Refineries x2.', cost: 120_000, target: 'nebula', mult: 2, requires: 1 },
  { id: 'nebula2', name: 'Hyperspectral Sieves', desc: 'Nebula Refineries x2.', cost: 1_300_000, target: 'nebula', mult: 2, requires: 10 },

  { id: 'pulsar1', name: 'Beam Focusers', desc: 'Pulsar Forges x2.', cost: 1_300_000, target: 'pulsar', mult: 2, requires: 1 },
  { id: 'pulsar2', name: 'Neutron Lattice', desc: 'Pulsar Forges x2.', cost: 14_000_000, target: 'pulsar', mult: 2, requires: 10 },

  { id: 'worm1', name: 'Folded Conduits', desc: 'Wormhole Siphons x2.', cost: 14_000_000, target: 'wormhole', mult: 2, requires: 1 },

  { id: 'galaxy1', name: 'Spiral Compactors', desc: 'Galaxy Compressors x2.', cost: 200_000_000, target: 'galaxy', mult: 2, requires: 1 },

  { id: 'sing1', name: 'Event Horizon Tap', desc: 'Singularity Engines x2.', cost: 3_300_000_000, target: 'singularity', mult: 2, requires: 1 },

  { id: 'g1', name: 'Cosmic Synergy', desc: 'All stardust production +25%.', cost: 1_000_000, target: 'global', mult: 1.25 },
  { id: 'g2', name: 'Dark Matter Lens', desc: 'All stardust production x2.', cost: 100_000_000, target: 'global', mult: 2 },
];

export const generatorCost = (def: GeneratorDef, owned: number) =>
  Math.ceil(def.baseCost * Math.pow(1.15, owned));

export const formatNumber = (n: number): string => {
  if (n < 1000) return n.toFixed(n < 10 && n % 1 !== 0 ? 1 : 0);
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + units[i];
};