import { useEffect, useRef, useState, useCallback } from 'react';
import {
  GENERATORS, UPGRADES, ACHIEVEMENTS, generatorCost, darkMatterFor, ASCEND_THRESHOLD,
  type GeneratorDef, type UpgradeDef,
} from './data';

const SAVE_KEY = 'cosmic-crunch-save-v2';

export type GameState = {
  stardust: number;
  totalEarned: number;
  totalClicks: number;
  generators: Record<string, number>;
  upgrades: Record<string, true>;
  achievements: Record<string, true>;
  goldenClicks: number;
  ascensions: number;
  darkMatter: number;
  totalEarnedAllTime: number;
  lastTick: number;
};

const initialState = (): GameState => ({
  stardust: 0,
  totalEarned: 0,
  totalClicks: 0,
  generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
  upgrades: {},
  achievements: {},
  goldenClicks: 0,
  ascensions: 0,
  darkMatter: 0,
  totalEarnedAllTime: 0,
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
  let clickSyn = 0.01; // base: 1% of cps added to click
  let goldenRate = 1;
  let goldenMult = 1;
  const genMult: Record<string, number> = {};
  for (const g of GENERATORS) genMult[g.id] = 1;
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (u.target === 'click') clickMult *= u.mult;
    else if (u.target === 'global') globalMult *= u.mult;
    else if (u.target === 'clickSyn') clickSyn *= u.mult;
    else if (u.target === 'goldenRate') goldenRate *= u.mult;
    else if (u.target === 'goldenMult') goldenMult *= u.mult;
    else genMult[u.target] = (genMult[u.target] ?? 1) * u.mult;
  }
  // Achievement bonus: +1% per achievement
  const achCount = Object.keys(state.achievements ?? {}).length;
  globalMult *= 1 + achCount * 0.01;
  // Dark matter bonus: +2% per
  globalMult *= 1 + (state.darkMatter ?? 0) * 0.02;
  return { clickMult, globalMult, genMult, clickSyn, goldenRate, goldenMult };
};

export const computeCps = (state: GameState) => {
  const { genMult, globalMult } = computeMultipliers(state);
  let cps = 0;
  for (const g of GENERATORS) cps += (state.generators[g.id] ?? 0) * g.baseCps * (genMult[g.id] ?? 1);
  return cps * globalMult;
};

export const computeClickPower = (state: GameState) => {
  const { clickMult, globalMult, clickSyn } = computeMultipliers(state);
  return (1 + computeCps(state) * clickSyn) * clickMult * globalMult;
};

export const isUpgradeVisible = (state: GameState, u: UpgradeDef) => {
  if (state.upgrades[u.id]) return false;
  if (u.requires && u.target !== 'click' && u.target !== 'global') {
    if ((state.generators[u.target] ?? 0) < u.requires) return false;
  }
  return true;
};

const checkAchievements = (s: GameState): GameState => {
  let achievements = s.achievements;
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    if (achievements[a.id]) continue;
    if (a.check(s)) {
      if (!changed) { achievements = { ...achievements }; changed = true; }
      achievements[a.id] = true;
    }
  }
  return changed ? { ...s, achievements } : s;
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
    loaded.totalEarnedAllTime = (loaded.totalEarnedAllTime ?? 0) + offline;
    loaded.lastTick = now;
    setState(checkAchievements(loaded));
  }, []);

  // Tick
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        const cps = computeCps(s);
        const gain = cps / 10;
        const next = {
          ...s,
          stardust: s.stardust + gain,
          totalEarned: s.totalEarned + gain,
          totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + gain,
          lastTick: Date.now(),
        };
        return checkAchievements(next);
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
      return checkAchievements({
        ...s,
        stardust: s.stardust + power,
        totalEarned: s.totalEarned + power,
        totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + power,
        totalClicks: s.totalClicks + 1,
      });
    });
  }, []);

  const buyGenerator = useCallback((def: GeneratorDef) => {
    setState((s) => {
      const owned = s.generators[def.id] ?? 0;
      const cost = generatorCost(def, owned);
      if (s.stardust < cost) return s;
      return checkAchievements({ ...s, stardust: s.stardust - cost, generators: { ...s.generators, [def.id]: owned + 1 } });
    });
  }, []);

  const buyUpgrade = useCallback((u: UpgradeDef) => {
    setState((s) => {
      if (s.upgrades[u.id] || s.stardust < u.cost) return s;
      return { ...s, stardust: s.stardust - u.cost, upgrades: { ...s.upgrades, [u.id]: true } };
    });
  }, []);

  // Golden star claim
  const claimGolden = useCallback(() => {
    setState((s) => {
      const { goldenMult } = computeMultipliers(s);
      const cps = computeCps(s);
      // 15x current click power OR 13% of total stardust OR 60s of CPS — whichever is best
      const bonus = Math.max(
        computeClickPower(s) * 15,
        s.stardust * 0.13,
        cps * 60,
      ) * goldenMult;
      return checkAchievements({
        ...s,
        stardust: s.stardust + bonus,
        totalEarned: s.totalEarned + bonus,
        totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + bonus,
        goldenClicks: (s.goldenClicks ?? 0) + 1,
      });
    });
  }, []);

  const ascend = useCallback(() => {
    const s = stateRef.current;
    const dmGain = darkMatterFor(s.totalEarned) - darkMatterFor(0);
    if (dmGain <= 0) {
      alert(`You need at least 1T stardust this run to ascend.`);
      return;
    }
    if (!confirm(`Ascend and gain ${dmGain} Dark Matter? You will reset stardust, generators, and upgrades, but keep achievements and Dark Matter (+2% global each).`)) return;
    setState((prev) => ({
      ...initialState(),
      achievements: prev.achievements,
      goldenClicks: prev.goldenClicks,
      ascensions: (prev.ascensions ?? 0) + 1,
      darkMatter: (prev.darkMatter ?? 0) + dmGain,
      totalEarnedAllTime: prev.totalEarnedAllTime ?? 0,
    }));
  }, []);

  const reset = useCallback(() => {
    if (!confirm('Hard reset — erase EVERYTHING including Dark Matter and achievements?')) return;
    localStorage.removeItem(SAVE_KEY);
    setState(initialState());
  }, []);

  return { state, click, buyGenerator, buyUpgrade, claimGolden, ascend, reset };
}