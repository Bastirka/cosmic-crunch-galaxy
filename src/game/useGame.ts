import { useEffect, useRef, useState, useCallback } from 'react';
import { GENERATORS, UPGRADES, generatorCost, type GeneratorDef, type UpgradeDef } from './data';

const SAVE_KEY = 'cosmic-crunch-save-v1';

export type GameState = {
  stardust: number;
  totalEarned: number;
  totalClicks: number;
  generators: Record<string, number>;
  upgrades: Record<string, true>;
  lastTick: number;
};

const initialState = (): GameState => ({
  stardust: 0,
  totalEarned: 0,
  totalClicks: 0,
  generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
  upgrades: {},
  lastTick: Date.now(),
});

const load = (): GameState => {
  if (typeof window === 'undefined') return initialState();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as GameState;
    return { ...initialState(), ...parsed, generators: { ...initialState().generators, ...parsed.generators } };
  } catch { return initialState(); }
};

export const computeMultipliers = (state: GameState) => {
  let clickMult = 1;
  let globalMult = 1;
  const genMult: Record<string, number> = {};
  for (const g of GENERATORS) genMult[g.id] = 1;
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (u.target === 'click') clickMult *= u.mult;
    else if (u.target === 'global') globalMult *= u.mult;
    else genMult[u.target] = (genMult[u.target] ?? 1) * u.mult;
  }
  return { clickMult, globalMult, genMult };
};

export const computeCps = (state: GameState) => {
  const { genMult, globalMult } = computeMultipliers(state);
  let cps = 0;
  for (const g of GENERATORS) cps += (state.generators[g.id] ?? 0) * g.baseCps * (genMult[g.id] ?? 1);
  return cps * globalMult;
};

export const computeClickPower = (state: GameState) => {
  const { clickMult, globalMult } = computeMultipliers(state);
  // base 1 + 1% of cps per click for late-game scaling
  return (1 + computeCps(state) * 0.01) * clickMult * globalMult;
};

export const isUpgradeVisible = (state: GameState, u: UpgradeDef) => {
  if (state.upgrades[u.id]) return false;
  if (u.requires && u.target !== 'click' && u.target !== 'global') {
    if ((state.generators[u.target] ?? 0) < u.requires) return false;
  }
  return true;
};

export function useGame() {
  const [state, setState] = useState<GameState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hydrate from localStorage on mount + offline catch-up
  useEffect(() => {
    const loaded = load();
    const now = Date.now();
    const elapsed = Math.max(0, Math.min((now - loaded.lastTick) / 1000, 60 * 60 * 8)); // cap 8h
    const offline = computeCps(loaded) * elapsed * 0.5; // 50% offline efficiency
    loaded.stardust += offline;
    loaded.totalEarned += offline;
    loaded.lastTick = now;
    setState(loaded);
  }, []);

  // Tick
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        const cps = computeCps(s);
        const gain = cps / 10;
        return { ...s, stardust: s.stardust + gain, totalEarned: s.totalEarned + gain, lastTick: Date.now() };
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Persist
  useEffect(() => {
    const id = setInterval(() => {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(stateRef.current)); } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const click = useCallback(() => {
    setState((s) => {
      const power = computeClickPower(s);
      return { ...s, stardust: s.stardust + power, totalEarned: s.totalEarned + power, totalClicks: s.totalClicks + 1 };
    });
  }, []);

  const buyGenerator = useCallback((def: GeneratorDef) => {
    setState((s) => {
      const owned = s.generators[def.id] ?? 0;
      const cost = generatorCost(def, owned);
      if (s.stardust < cost) return s;
      return { ...s, stardust: s.stardust - cost, generators: { ...s.generators, [def.id]: owned + 1 } };
    });
  }, []);

  const buyUpgrade = useCallback((u: UpgradeDef) => {
    setState((s) => {
      if (s.upgrades[u.id] || s.stardust < u.cost) return s;
      return { ...s, stardust: s.stardust - u.cost, upgrades: { ...s.upgrades, [u.id]: true } };
    });
  }, []);

  const reset = useCallback(() => {
    if (!confirm('Reset all progress? This cannot be undone.')) return;
    localStorage.removeItem(SAVE_KEY);
    setState(initialState());
  }, []);

  return { state, click, buyGenerator, buyUpgrade, reset };
}