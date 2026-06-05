import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  GENERATORS, UPGRADES, ACHIEVEMENTS, generatorCost, darkMatterFor, ASCEND_THRESHOLD,
  type GeneratorDef, type UpgradeDef,
} from './data';
import { useAuth } from '../lib/auth';
import {
  loadGuestSave, saveGuestSave, loadCloudSave, saveCloudSave,
  mergeGuestSaveIntoCloudSave, calculateOfflineEarnings, applyOfflineEarnings,
  type OfflineResult,
} from './cloudSave';
import {
  getDailyStatus, computeDailyReward, defaultDailyRewards, type DailyRewards,
} from './daily';
import { updateLeaderboardEntry } from './leaderboard';
import {
  pickEventType, computeEventReward, randBetween,
  SPAWN_MIN_MS, SPAWN_MAX_MS, EVENT_MIN_MS, EVENT_MAX_MS, STORM_DURATION_MS,
  type RandomEventType, type ActiveRandomEvent, type EventReward,
} from './randomEvents';
import {
  defaultQuests, ensureActiveQuests, updateQuestProgress, generateQuest,
  type QuestsState, type QuestEvent, type QuestRewardType,
} from './quests';
import {
  getDefaultCosmetics, checkCosmeticUnlocks, equipCosmetic as equipCosmeticPure,
  type CosmeticsState, type CosmeticCategory,
} from './cosmetics';
import {
  playSfx, playMusic, pauseMusic, resumeMusic, applySoundSettings,
  DEFAULT_SOUND_SETTINGS, type SoundSettings,
} from '../lib/audio';
import {
  defaultAntiCheat, createClickTracker, validateClick, applyClickRewardSafely,
  escalatePenalty, WARNING_COOLDOWN_MS, type AntiCheatState, type ClickInput,
} from './antiCheat';
import {
  defaultGalaxy, ambientGlobalMult, calculateGalaxyObjectProduction,
  waterfallEarnings, switchGalaxyObject as switchGalaxyObjectPure,
  buyGalaxyGenerator as buyGalaxyGeneratorPure, buyGalaxyUpgrade as buyGalaxyUpgradePure,
  unlockGalaxyObject as unlockGalaxyObjectPure, canUnlockGalaxyObject, galaxyGeneratorCost,
  galaxyUpgradeCost, type GalaxyState,
} from './galaxy';
import type { StarsState } from './stars';
import {
  defaultBuffs, addBuff as addBuffPure, removeBuff as removeBuffPure, extendBuff,
  calculateBuffMultipliers, checkBuffSynergies, pickGrantableBuff,
  PERM_BUFFS, SYNERGIES, isBuffUnlocked, type BuffsState,
} from './buffs';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'local' | 'error';

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
  lifetimeDarkMatter: number;
  lastAscendedAt: string | null;
  totalEarnedAllTime: number;
  lastTick: number;
  dailyRewards: DailyRewards;
  // Random events
  randomEventsCollected: number;
  cosmicStormUses: number;
  blackHolesCollected: number;
  stardustShowersCollected: number;
  activeBoosts: { cosmicStormUntil: number | null };
  lastRandomEventAt: string | null;
  quests: QuestsState;
  cosmetics: CosmeticsState;
  soundSettings: SoundSettings;
  antiCheat: AntiCheatState;
  // Late-game galaxy expansion (Solar Core = the existing economy).
  galaxy: GalaxyState;
  // Legacy star-layer alias kept so older helpers continue to type-check.
  stars?: StarsState;
  // Centralized buff system (temporary + permanent + synergies).
  buffs: BuffsState;
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
  // Cosmic Storm: x2 to all production + click power while active.
  const stormUntil = state.activeBoosts?.cosmicStormUntil ?? null;
  if (stormUntil != null && stormUntil > Date.now()) globalMult *= 2;
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

/** Minimum gap between persisted writes — coalesces rapid actions (e.g. clicks). */
const SAVE_MIN_GAP_MS = 2000;
/** Auto-save heartbeat. */
const AUTOSAVE_MS = 5000;
/** Minimum gap between leaderboard writes — keeps frequent actions from spamming Supabase. */
const LEADERBOARD_MIN_GAP_MS = 45000;

export function useGame() {
  const { user, mode, ready } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<GameState>(initialState);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [offlineEarned, setOfflineEarned] = useState<OfflineResult | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Keep the latest auth context available to the (stable) save routines.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const userRef = useRef(user);
  userRef.current = user;
  // Runtime anti-cheat click tracker (timestamps/positions — never persisted).
  const clickTrackerRef = useRef(createClickTracker());

  // ─── Persistence ───────────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveAt = useRef(0);

  const doPersist = useCallback(async () => {
    lastSaveAt.current = Date.now();
    const s = stateRef.current;
    if (modeRef.current === 'cloud' && userIdRef.current) {
      setSaveStatus('saving');
      const ok = await saveCloudSave(userIdRef.current, s);
      setSaveStatus(ok ? 'saved' : 'error');
    } else {
      saveGuestSave(s);
      setSaveStatus('local');
    }
  }, []);

  /** Throttled save request — guarantees a trailing write within SAVE_MIN_GAP_MS. */
  const requestSave = useCallback(() => {
    if (saveTimer.current) return;
    const delay = Math.max(0, SAVE_MIN_GAP_MS - (Date.now() - lastSaveAt.current));
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void doPersist();
    }, delay);
  }, [doPersist]);

  // ─── Leaderboard sync (debounced separately from saves to avoid spam) ────
  const lbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLbAt = useRef(0);

  const pushLeaderboard = useCallback(() => {
    lastLbAt.current = Date.now();
    // Flagged saves never update the leaderboard (client-side gate; RLS still
    // restricts writes to the user's own row server-side).
    if (modeRef.current === 'cloud' && userRef.current && !stateRef.current.antiCheat.flagged) {
      void updateLeaderboardEntry(stateRef.current, userRef.current);
    }
  }, []);

  /**
   * Request a leaderboard update. Guests never write. `force` (used for rare,
   * major events) pushes immediately; otherwise writes are throttled to at most
   * once per LEADERBOARD_MIN_GAP_MS so frequent actions don't spam Supabase.
   */
  const requestLeaderboard = useCallback(
    (force = false) => {
      if (modeRef.current !== 'cloud' || !userRef.current) return;
      if (force) {
        if (lbTimer.current) {
          clearTimeout(lbTimer.current);
          lbTimer.current = null;
        }
        pushLeaderboard();
        return;
      }
      if (lbTimer.current) return;
      const delay = Math.max(0, LEADERBOARD_MIN_GAP_MS - (Date.now() - lastLbAt.current));
      lbTimer.current = setTimeout(() => {
        lbTimer.current = null;
        pushLeaderboard();
      }, delay);
    },
    [pushLeaderboard],
  );

  // ─── Load (guest or cloud) on auth resolution & on login/logout ─────────
  const loadedRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const finish = (loaded: GameState, status: SaveStatus) => {
      if (cancelled) return;
      const offline = calculateOfflineEarnings(loaded);
      let withOffline = applyOfflineEarnings(loaded); // also resets last_active_at to now
      // Offline earnings advance the matching quest.
      if (offline.earnings > 0) {
        withOffline = { ...withOffline, quests: updateQuestProgress(withOffline.quests, 'offline', offline.earnings) };
      }
      // Ensure the player always has 3 active quests (new players get their first set here).
      withOffline = { ...withOffline, quests: ensureActiveQuests(withOffline) };
      setState(checkAchievements(withOffline));
      setSaveStatus(status);
      loadedRef.current = true;
      prevUserIdRef.current = userId;
      if (offline.earnings > 0) {
        setOfflineEarned(offline);
        playSfx('offline');
        // Persist immediately so the new last_active_at sticks and the reward
        // can't be granted again on the next load (guest localStorage or cloud).
        requestSave();
        requestLeaderboard(true); // offline earnings applied → major progress
      } else {
        requestLeaderboard(true); // refresh leaderboard row on (re)load
      }
    };

    (async () => {
      if (!loadedRef.current) {
        // First load after the page opens.
        if (userId) {
          const cloud = await loadCloudSave(userId);
          if (cloud) finish(cloud, 'saved');
          else finish(await mergeGuestSaveIntoCloudSave(userId), 'saved'); // upload existing guest save
        } else {
          finish(loadGuestSave(), 'local');
        }
        return;
      }

      // Auth changed after the game was already running.
      const prev = prevUserIdRef.current;
      if (!prev && userId) {
        // Guest logged in → merge guest progress into the cloud save.
        finish(await mergeGuestSaveIntoCloudSave(userId), 'saved');
      } else if (prev && !userId) {
        // Logged out → fall back to the local guest save (cloud is untouched).
        finish(loadGuestSave(), 'local');
      } else if (userId && prev !== userId) {
        // Switched accounts.
        const cloud = await loadCloudSave(userId);
        finish(cloud ?? (await mergeGuestSaveIntoCloudSave(userId)), 'saved');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, userId, requestSave, requestLeaderboard]);

  // ─── Tick ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        // Centralized buff multipliers drive all production (PART 5).
        const m = calculateBuffMultipliers(s);
        const solarGain = (computeCps(s) * m.cps) / 10; // Solar Core (existing economy)
        // Galaxy objects 2+ produce extra stardust that waterfalls down into
        // lower wallets for source-based upgrade eligibility.
        const ambient = ambientGlobalMult(s);
        const galaxyMult = m.cps * m.starProduction;
        // Stellar Network synergy: Star 2+ output gives +10% support to Star 1.
        const star1Support = checkBuffSynergies(s).includes('stellarNetwork') ? 1.1 : 1;
        let galaxy = waterfallEarnings(s.galaxy, 'solar_core', solarGain);
        let galaxyGain = 0; // contribution to the main stardust pool
        for (const obj of s.galaxy.objects) {
          if (!obj.unlocked || obj.id === 'solar_core') continue;
          const p = (calculateGalaxyObjectProduction(obj, ambient) * galaxyMult) / 10;
          if (p > 0) {
            galaxyGain += p * star1Support;
            galaxy = waterfallEarnings(galaxy, obj.id, p); // wallets get the un-boosted amount
          }
        }
        const totalGain = solarGain + galaxyGain;
        const next = {
          ...s,
          galaxy,
          stardust: s.stardust + totalGain,
          totalEarned: s.totalEarned + totalGain,
          totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + totalGain,
          lastTick: Date.now(),
          // Passive earning folds into 'earn' quests here — piggybacks on the
          // existing tick setState (no separate polling loop).
          quests: updateQuestProgress(s.quests, 'earn', totalGain),
        };
        return checkAchievements(next);
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  // ─── Auto-save heartbeat (every 5s) ──────────────────────────────────────
  useEffect(() => {
    if (!loadedRef.current && !ready) return;
    const id = setInterval(() => requestSave(), AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [ready, requestSave]);

  // ─── Save on tab close / hide ────────────────────────────────────────────
  useEffect(() => {
    const flush = () => {
      // localStorage write is synchronous; cloud write is best-effort.
      saveGuestSave(stateRef.current);
      if (modeRef.current === 'cloud' && userIdRef.current) {
        void saveCloudSave(userIdRef.current, stateRef.current);
      }
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') requestSave();
    });
    return () => window.removeEventListener('beforeunload', flush);
  }, [requestSave]);

  // ─── Immediate save on milestone changes (achievements / ascend / golden) ─
  const achCount = Object.keys(state.achievements ?? {}).length;
  const milestoneKey = `${achCount}|${state.ascensions}|${state.darkMatter}|${state.goldenClicks}`;
  const prevMilestoneRef = useRef(milestoneKey);
  const prevAchCountRef = useRef(achCount);
  useEffect(() => {
    if (!loadedRef.current) return;
    if (achCount > prevAchCountRef.current) playSfx('achievement');
    prevAchCountRef.current = achCount;
    if (prevMilestoneRef.current !== milestoneKey) {
      prevMilestoneRef.current = milestoneKey;
      requestSave();
      requestLeaderboard(true); // achievement / ascension / golden = major progress
    }
  }, [milestoneKey, requestSave, requestLeaderboard]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  // Fold one or more quest events into a state object (used inside updaters).
  const withQuest = (s: GameState, event: QuestEvent, amount: number, metadata?: { generatorId?: string }): GameState => {
    const q = updateQuestProgress(s.quests, event, amount, metadata);
    return q === s.quests ? s : { ...s, quests: q };
  };

  const click = useCallback((ev?: ClickInput) => {
    const now = Date.now();
    const m = calculateBuffMultipliers(stateRef.current);
    // Gravity Collapse disables clicking while active (generators run x4 instead).
    if (m.clicksDisabled) {
      playSfx('error');
      return;
    }
    // Validate the click BEFORE rewarding (records timing into the tracker).
    const v = validateClick(ev, clickTrackerRef.current, now);
    // Click power runs through the centralized buff multiplier (PART 5).
    let power = computeClickPower(stateRef.current) * m.click;
    // Crit click: chance/multiplier come from buffs (e.g. Quantum Clicks).
    const isCrit = m.critChance > 0 && Math.random() < m.critChance;
    if (isCrit) power *= m.critMult;
    const { reward, counted } = applyClickRewardSafely(power, v);

    // Warning toast on suspicious/severe input, throttled to one per 10s.
    let warned = false;
    if (v.severity !== 'ok' && now - clickTrackerRef.current.lastWarnAt > WARNING_COOLDOWN_MS) {
      clickTrackerRef.current.lastWarnAt = now;
      warned = true;
    }
    if (v.severity !== 'ok') {
      escalatePenalty(clickTrackerRef.current, v.severity, stateRef.current.antiCheat.warnings, now);
    }

    setState((s) => {
      const ac = s.antiCheat;
      const newWarnings = ac.warnings + (warned ? 1 : 0);
      const nextAc: AntiCheatState = {
        ...ac,
        max_cps_detected: Math.max(ac.max_cps_detected, v.cps),
        suspicious_clicks: ac.suspicious_clicks + (v.severity !== 'ok' ? 1 : 0),
        blocked_clicks: ac.blocked_clicks + (counted ? 0 : 1),
        warnings: newWarnings,
        last_warning_at: warned ? new Date().toISOString() : ac.last_warning_at,
        // Flag persistent cheating for logged-in (leaderboard) users only.
        flagged: ac.flagged || (modeRef.current === 'cloud' && (newWarnings >= 5 || ac.suspicious_clicks >= 300)),
      };

      // Blocked clicks award nothing and don't advance click stats/quests.
      if (!counted) return { ...s, antiCheat: nextAc };

      let next = checkAchievements({
        ...s,
        stardust: s.stardust + reward,
        totalEarned: s.totalEarned + reward,
        totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + reward,
        totalClicks: s.totalClicks + 1,
        antiCheat: nextAc,
      });
      next = withQuest(next, 'click', 1);
      next = withQuest(next, 'earn', reward);
      // Quantum Harvest synergy: a crit extends Hyper Harvest (+3s, cap +30s).
      if (isCrit && checkBuffSynergies(next).includes('quantumHarvest')) {
        next = { ...next, buffs: extendBuff(next.buffs, 'hyperHarvest', 3, 30, now) };
      }
      return next;
    });

    if (counted) playSfx('click');
    if (warned) toast('Slow down — unnatural clicking detected.', { duration: 4000 });
    requestSave();
  }, [requestSave]);

  const buyGenerator = useCallback((def: GeneratorDef) => {
    const s0 = stateRef.current;
    const canAfford = s0.stardust >= generatorCost(def, s0.generators[def.id] ?? 0);
    setState((s) => {
      const owned = s.generators[def.id] ?? 0;
      const cost = generatorCost(def, owned);
      if (s.stardust < cost) return s;
      let next = checkAchievements({ ...s, stardust: s.stardust - cost, generators: { ...s.generators, [def.id]: owned + 1 } });
      next = withQuest(next, 'buyGenerator', 1, { generatorId: def.id });
      return next;
    });
    playSfx(canAfford ? 'buy' : 'error');
    requestSave();
    requestLeaderboard(); // throttled — buying happens often
  }, [requestSave, requestLeaderboard]);

  const buyUpgrade = useCallback((u: UpgradeDef) => {
    const s0 = stateRef.current;
    const canAfford = !s0.upgrades[u.id] && s0.stardust >= u.cost;
    setState((s) => {
      if (s.upgrades[u.id] || s.stardust < u.cost) return s;
      const next: GameState = { ...s, stardust: s.stardust - u.cost, upgrades: { ...s.upgrades, [u.id]: true } };
      return withQuest(next, 'buyUpgrade', 1);
    });
    playSfx(canAfford ? 'upgrade' : 'error');
    requestSave();
    requestLeaderboard(); // throttled
  }, [requestSave, requestLeaderboard]);

  // ─── Galaxy progression (late-game multi-object layer) ────────────────────
  const switchGalaxyObject = useCallback((objectId: string) => {
    setState((s) => ({ ...s, galaxy: switchGalaxyObjectPure(s.galaxy, objectId) }));
    requestSave();
  }, [requestSave]);

  const unlockGalaxyObject = useCallback((objectId: string) => {
    const canUnlock = canUnlockGalaxyObject(stateRef.current, objectId);
    setState((s) => ({ ...s, galaxy: unlockGalaxyObjectPure(s, objectId) }));
    playSfx(canUnlock ? 'achievement' : 'error');
    requestSave();
    if (canUnlock) requestLeaderboard(true);
  }, [requestSave, requestLeaderboard]);

  const buyGalaxyGenerator = useCallback((objectId: string, def: GeneratorDef) => {
    const obj = stateRef.current.galaxy.objects.find((x) => x.id === objectId);
    const canAfford = !!obj && obj.availableEarned >= galaxyGeneratorCost(obj, def);
    setState((s) => ({ ...s, galaxy: buyGalaxyGeneratorPure(s.galaxy, objectId, def) }));
    playSfx(canAfford ? 'buy' : 'error');
    requestSave();
  }, [requestSave]);

  const buyGalaxyUpgrade = useCallback((objectId: string, u: UpgradeDef) => {
    const obj = stateRef.current.galaxy.objects.find((x) => x.id === objectId);
    const canAfford = !!obj && !obj.upgrades[u.id] && obj.availableEarned >= galaxyUpgradeCost(obj, u);
    setState((s) => ({ ...s, galaxy: buyGalaxyUpgradePure(s.galaxy, objectId, u) }));
    playSfx(canAfford ? 'upgrade' : 'error');
    requestSave();
  }, [requestSave]);

  // ─── Buffs ────────────────────────────────────────────────────────────────
  const activateBuff = useCallback((buffId: string, source = 'manual', durationSeconds?: number) => {
    setState((s) => ({ ...s, buffs: addBuffPure(s.buffs, buffId, durationSeconds, source) }));
    playSfx('event');
    requestSave();
  }, [requestSave]);

  const clearBuff = useCallback((buffId: string) => {
    setState((s) => ({ ...s, buffs: removeBuffPure(s.buffs, buffId) }));
    requestSave();
  }, [requestSave]);

  // Golden star claim
  const claimGolden = useCallback(() => {
    setState((s) => {
      const { goldenMult } = computeMultipliers(s);
      const buffGolden = calculateBuffMultipliers(s).golden;
      const cps = computeCps(s);
      // 15x current click power OR 13% of total stardust OR 60s of CPS — whichever is best
      const bonus = Math.max(
        computeClickPower(s) * 15,
        s.stardust * 0.13,
        cps * 60,
      ) * goldenMult * buffGolden;
      return checkAchievements({
        ...s,
        stardust: s.stardust + bonus,
        totalEarned: s.totalEarned + bonus,
        totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + bonus,
        goldenClicks: (s.goldenClicks ?? 0) + 1,
      });
    });
    requestSave();
  }, [requestSave]);

  // Ascension / prestige. Confirmation is handled by the UI modal, not here.
  const ascend = useCallback(() => {
    setState((prev) => {
      // Ascension Dark Matter gain runs through the centralized buff system.
      const dmMult = calculateBuffMultipliers(prev).darkMatter;
      const dmGain = Math.floor(darkMatterFor(prev.totalEarned) * dmMult);
      if (dmGain <= 0) return prev; // guard: never ascend for 0 Dark Matter
      let next: GameState = {
        ...initialState(), // resets stardust, generators, upgrades, run total
        achievements: prev.achievements, // kept
        goldenClicks: prev.goldenClicks, // kept
        ascensions: (prev.ascensions ?? 0) + 1, // increment
        darkMatter: (prev.darkMatter ?? 0) + dmGain, // permanent — accumulates
        lifetimeDarkMatter: (prev.lifetimeDarkMatter ?? 0) + dmGain,
        lastAscendedAt: new Date().toISOString(),
        totalEarnedAllTime: prev.totalEarnedAllTime ?? 0, // lifetime stat kept
        dailyRewards: prev.dailyRewards, // keep daily streak through ascension
        // Random-event lifetime stats are kept; active boosts are cleared.
        randomEventsCollected: prev.randomEventsCollected ?? 0,
        cosmicStormUses: prev.cosmicStormUses ?? 0,
        blackHolesCollected: prev.blackHolesCollected ?? 0,
        stardustShowersCollected: prev.stardustShowersCollected ?? 0,
        lastRandomEventAt: prev.lastRandomEventAt ?? null,
        quests: prev.quests, // keep quest progress through ascension
        cosmetics: prev.cosmetics, // cosmetics are permanent
        soundSettings: prev.soundSettings, // device prefs persist
        antiCheat: prev.antiCheat, // never reset anti-cheat history on ascension
        galaxy: {
          activeObjectId: 'solar_core',
          objects: prev.galaxy.objects.map((obj) => ({
            ...obj,
            availableEarned: 0,
            generators: Object.fromEntries(Object.keys(obj.generators).map((id) => [id, 0])),
            upgrades: {},
          })),
        }, // unlocked galaxy objects persist; their run wallets reset
        buffs: prev.buffs, // keep active/timed buffs through ascension
      };
      next = withQuest(next, 'ascend', 1);
      next = withQuest(next, 'darkMatter', dmGain);
      return next;
    });
    if (darkMatterFor(stateRef.current.totalEarned) > 0) playSfx('ascension');
    requestSave(); // persist immediately (guest localStorage or Supabase)
    requestLeaderboard(true); // push ascensions / dark_matter / total_earned
  }, [requestSave, requestLeaderboard]);

  // Daily reward claim
  const claimDaily = useCallback(() => {
    setState((s) => {
      const status = getDailyStatus(s.dailyRewards);
      if (!status.canClaim) return s;
      const reward = computeDailyReward(s, status.claimDay);
      // Daily reward runs through the daily buff multiplier (PART 5).
      const dustReward = reward.stardust * calculateBuffMultipliers(s).daily;
      let next = checkAchievements({
        ...s,
        stardust: s.stardust + dustReward,
        totalEarned: s.totalEarned + dustReward,
        totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + dustReward,
        darkMatter: (s.darkMatter ?? 0) + reward.darkMatter,
        dailyRewards: {
          daily_streak: status.claimDay, // claimDay already equals the new streak value
          last_daily_claim_at: new Date().toISOString(),
          total_daily_claims: (s.dailyRewards.total_daily_claims ?? 0) + 1,
        },
      });
      next = withQuest(next, 'daily', 1);
      // Routine Master synergy: a daily claim also advances one active quest.
      if (checkBuffSynergies(next).includes('routineMaster')) {
        const q = next.quests.active_quests.find((x) => !x.completed);
        if (q) {
          next = {
            ...next,
            quests: {
              ...next.quests,
              active_quests: next.quests.active_quests.map((x) =>
                x.id === q.id ? { ...x, current: Math.min(x.target, x.current + 1), completed: x.current + 1 >= x.target } : x,
              ),
            },
          };
        }
      }
      // Daily rewards can also grant a short buff (PART 1 source: daily).
      const granted = pickGrantableBuff(next, ['solarSurge', 'starFever', 'hyperHarvest']);
      if (granted) next = { ...next, buffs: addBuffPure(next.buffs, granted, undefined, 'daily') };
      return next;
    });
    if (getDailyStatus(stateRef.current.dailyRewards).canClaim) playSfx('daily');
    requestSave(); // persist immediately so the claim can't be repeated on refresh
    requestLeaderboard(true); // daily reward claimed = major progress
  }, [requestSave, requestLeaderboard]);

  const reset = useCallback(() => {
    if (!confirm('Hard reset — erase EVERYTHING including Dark Matter and achievements?')) return;
    setState(initialState());
    requestSave();
  }, [requestSave]);

  const dismissOffline = useCallback(() => setOfflineEarned(null), []);

  // ─── Random events ───────────────────────────────────────────────────────
  const [randomEvent, setRandomEvent] = useState<ActiveRandomEvent | null>(null);
  const randomEventRef = useRef<ActiveRandomEvent | null>(null);
  randomEventRef.current = randomEvent;
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const despawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNextRef = useRef<() => void>(() => {});
  const forceSpawnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const clearTimers = () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
      if (despawnTimerRef.current) clearTimeout(despawnTimerRef.current);
      spawnTimerRef.current = null;
      despawnTimerRef.current = null;
    };

    // scheduleNextRandomEvent — wait a random 2–5 min before the next spawn.
    // Star Fever (+event spawn chance) shortens the wait.
    const scheduleNext = () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
      const spawnBoost = 1 + calculateBuffMultipliers(stateRef.current).eventSpawnChance;
      spawnTimerRef.current = setTimeout(spawn, randBetween(SPAWN_MIN_MS, SPAWN_MAX_MS) / spawnBoost);
    };
    scheduleNextRef.current = scheduleNext;
    forceSpawnRef.current = () => spawn();

    // spawnRandomEvent — only while visible and when none is already on screen.
    function spawn() {
      if (typeof document !== 'undefined' && document.hidden) { scheduleNext(); return; }
      if (randomEventRef.current) { scheduleNext(); return; }
      // Storm Season synergy (eventDuration) makes events linger longer.
      const extraMs = calculateBuffMultipliers(stateRef.current).eventDuration * 1000;
      const duration = Math.round(randBetween(EVENT_MIN_MS, EVENT_MAX_MS)) + extraMs;
      const ev: ActiveRandomEvent = {
        type: pickEventType(),
        id: Date.now(),
        duration,
        expiresAt: Date.now() + duration,
        x: randBetween(8, 82),
        y: randBetween(16, 72),
      };
      setRandomEvent(ev);
      setState((s) => ({ ...s, lastRandomEventAt: new Date().toISOString() }));
      if (despawnTimerRef.current) clearTimeout(despawnTimerRef.current);
      despawnTimerRef.current = setTimeout(() => {
        setRandomEvent(null); // disappears uncollected
        scheduleNext();
      }, duration);
    }

    // Pause spawning while the tab is hidden; clear any active event so its
    // limited lifetime isn't counted against hidden time. Resume on return.
    const onVisibility = () => {
      if (document.hidden) {
        clearTimers();
        setRandomEvent(null);
      } else {
        scheduleNext();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    scheduleNext();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimers();
    };
  }, []);

  // collectRandomEvent — apply the reward, bump counters, save, reschedule.
  const collectRandomEvent = useCallback(
    (type: RandomEventType): EventReward | null => {
      const ev = randomEventRef.current;
      if (!ev || ev.type !== type) return null;
      if (despawnTimerRef.current) clearTimeout(despawnTimerRef.current);
      setRandomEvent(null);

      const reward = computeEventReward(type, stateRef.current);
      // Event rewards run through the centralized buff multipliers (PART 5).
      const m = calculateBuffMultipliers(stateRef.current);
      const synergies = checkBuffSynergies(stateRef.current);
      let dust = reward.stardust * m.event;
      if (type === 'goldenComet') dust *= m.golden;
      // Comet Specialist synergy: every 5th Golden Comet adds 30s worth of CPS.
      if (type === 'goldenComet' && synergies.includes('cometSpecialist')) {
        const nextGolden = (stateRef.current.goldenClicks ?? 0) + 1;
        if (nextGolden % 5 === 0) dust += computeCps(stateRef.current) * 30;
      }
      setState((s) => {
        const next: GameState = {
          ...s,
          stardust: s.stardust + dust,
          totalEarned: s.totalEarned + dust,
          totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + dust,
          darkMatter: (s.darkMatter ?? 0) + reward.darkMatter,
          lifetimeDarkMatter: (s.lifetimeDarkMatter ?? 0) + reward.darkMatter,
          randomEventsCollected: (s.randomEventsCollected ?? 0) + 1,
        };
        if (type === 'goldenComet') next.goldenClicks = (s.goldenClicks ?? 0) + 1;
        if (type === 'blackHole') next.blackHolesCollected = (s.blackHolesCollected ?? 0) + 1;
        if (type === 'stardustShower') next.stardustShowersCollected = (s.stardustShowersCollected ?? 0) + 1;
        if (type === 'cosmicStorm') {
          next.cosmicStormUses = (s.cosmicStormUses ?? 0) + 1;
          // Refresh the timer; never stack the multiplier.
          next.activeBoosts = { ...s.activeBoosts, cosmicStormUntil: Date.now() + STORM_DURATION_MS };
        }
        // Events grant a themed temporary buff (PART 1 source: random events).
        const pool: Record<RandomEventType, string[]> = {
          goldenComet: ['goldenPulse', 'nebulaLuck'],
          stardustShower: ['hyperHarvest', 'solarSurge'],
          blackHole: ['nebulaLuck', 'starFever'],
          cosmicStorm: ['starFever'],
        };
        const granted = pickGrantableBuff(next, pool[type]);
        if (granted) next.buffs = addBuffPure(next.buffs, granted, undefined, 'event');

        let result = checkAchievements(next);
        result = withQuest(result, 'randomEvent', 1);
        if (type === 'goldenComet') result = withQuest(result, 'goldenComet', 1);
        return result;
      });

      playSfx('event');
      requestSave(); // events save immediately after collection
      if (type !== 'cosmicStorm') requestLeaderboard(true); // golden_caught / dark_matter / total_earned
      // Lucky Comet Chain synergy: a Golden Comet may instantly chain a new event.
      if (type === 'goldenComet' && synergies.includes('luckyCometChain') && Math.random() < 0.2) {
        setTimeout(() => forceSpawnRef.current(), 700);
      } else {
        scheduleNextRef.current();
      }
      return reward;
    },
    [requestSave, requestLeaderboard],
  );

  // ─── Quests ──────────────────────────────────────────────────────────────
  // Toast once when a quest becomes completable (primed on first load so saved
  // already-completed quests don't re-toast).
  const completedSeenRef = useRef<Set<string>>(new Set());
  const questsPrimedRef = useRef(false);
  useEffect(() => {
    const active = state.quests?.active_quests ?? [];
    if (!questsPrimedRef.current) {
      if (loadedRef.current) {
        for (const q of active) if (q.completed) completedSeenRef.current.add(q.id);
        questsPrimedRef.current = true;
      }
      return;
    }
    for (const q of active) {
      if (q.completed && !q.claimed && !completedSeenRef.current.has(q.id)) {
        completedSeenRef.current.add(q.id);
        toast('Quest completed! 🎯', { description: q.title });
        playSfx('quest');
      }
    }
  }, [state.quests]);

  // claimQuestReward — grant reward, bump counters, replace with a fresh quest.
  const claimQuestReward = useCallback(
    (questId: string): { reward_type: QuestRewardType; reward_amount: number } | null => {
      const q = stateRef.current.quests.active_quests.find((x) => x.id === questId);
      if (!q || !q.completed || q.claimed) return null;
      const reward = { reward_type: q.reward_type, reward_amount: q.reward_amount };

      setState((s) => {
        const idx = s.quests.active_quests.findIndex((x) => x.id === questId);
        if (idx < 0) return s;
        const cur = s.quests.active_quests[idx];
        if (!cur.completed || cur.claimed) return s;

        const isStardust = reward.reward_type === 'stardust';
        // Quest stardust rewards run through the quest buff multiplier (PART 5).
        const dustReward = isStardust ? reward.reward_amount * calculateBuffMultipliers(s).quest : 0;
        const others = s.quests.active_quests.filter((x) => x.id !== questId);
        const replacement = generateQuest(s, others); // avoids duplicate type+target

        const next: GameState = {
          ...s,
          stardust: s.stardust + dustReward,
          totalEarned: s.totalEarned + dustReward,
          totalEarnedAllTime: (s.totalEarnedAllTime ?? 0) + dustReward,
          darkMatter: (s.darkMatter ?? 0) + (isStardust ? 0 : reward.reward_amount),
          lifetimeDarkMatter: (s.lifetimeDarkMatter ?? 0) + (isStardust ? 0 : reward.reward_amount),
          quests: {
            ...s.quests,
            active_quests: [...others, replacement],
            completed_quests: s.quests.completed_quests + 1,
            total_quest_rewards_claimed: s.quests.total_quest_rewards_claimed + 1,
            last_quest_generated_at: replacement.created_at,
          },
        };
        // Completing a quest can grant a temporary buff (PART 1 source: quests).
        const granted = pickGrantableBuff(next, ['quantumClicks', 'solarSurge', 'nebulaLuck']);
        const withBuff = granted ? { ...next, buffs: addBuffPure(next.buffs, granted, undefined, 'quest') } : next;
        return checkAchievements(withBuff);
      });

      playSfx('questReward');
      requestSave(); // reward saves immediately after claiming
      requestLeaderboard(true); // total_earned / stardust may have changed
      return reward;
    },
    [requestSave, requestLeaderboard],
  );

  // ─── Buff stats: synergy triggers + permanent unlocks ─────────────────────
  const synergySig = checkBuffSynergies(state).sort().join('|');
  const prevSynergiesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!loadedRef.current) return;
    const active = new Set(checkBuffSynergies(stateRef.current));
    let newCount = 0;
    for (const id of active) if (!prevSynergiesRef.current.has(id)) newCount++;
    const newlyActive = [...active].filter((id) => !prevSynergiesRef.current.has(id));
    prevSynergiesRef.current = active;
    if (newCount > 0) {
      for (const id of newlyActive) toast(`Synergy activated: ${SYNERGIES[id].name}! ${SYNERGIES[id].icon}`);
      setState((s) => ({
        ...s,
        buffs: { ...s.buffs, buffStats: { ...s.buffs.buffStats, totalSynergiesTriggered: s.buffs.buffStats.totalSynergiesTriggered + newCount } },
      }));
    }
  }, [synergySig]);

  // Record permanent-buff unlocks (for stats/UI) as milestones are reached.
  const permBuffSig = `${state.darkMatter}|${state.ascensions}|${state.goldenClicks}|${state.quests.completed_quests}|${state.galaxy.objects.filter((o) => o.unlocked).length}|${state.dailyRewards.total_daily_claims}`;
  useEffect(() => {
    if (!loadedRef.current) return;
    const unlocked = Object.keys(PERM_BUFFS).filter((id) => isBuffUnlocked(stateRef.current, id));
    const known = new Set(stateRef.current.buffs.unlockedPermanentBuffs);
    if (unlocked.length === known.size && unlocked.every((id) => known.has(id))) return;
    setState((s) => ({ ...s, buffs: { ...s.buffs, unlockedPermanentBuffs: unlocked } }));
    requestSave();
  }, [permBuffSig, requestSave]);

  // ─── Cosmetics ───────────────────────────────────────────────────────────
  // Coarse signature so the unlock check runs on meaningful progress, not every
  // 100ms tick. Cosmetics are visual-only and never touch balance.
  const cosmeticSig = [
    Math.floor(Math.log10((state.totalEarnedAllTime ?? 0) + 1) * 4),
    Math.floor(state.totalClicks / 100),
    state.goldenClicks, state.ascensions, state.darkMatter,
    state.randomEventsCollected, state.cosmicStormUses, state.quests.completed_quests,
  ].join('|');
  useEffect(() => {
    if (!loadedRef.current) return;
    const { newlyUnlocked } = checkCosmeticUnlocks(stateRef.current);
    if (newlyUnlocked.length === 0) return;
    setState((s) => ({ ...s, cosmetics: checkCosmeticUnlocks(s).cosmetics }));
    for (const c of newlyUnlocked) toast(`New cosmetic unlocked: ${c.name}! 🎨`);
    requestSave();
  }, [cosmeticSig, requestSave]);

  const equipCosmetic = useCallback(
    (category: CosmeticCategory, id: string) => {
      setState((s) => {
        const cos = equipCosmeticPure(s.cosmetics, category, id);
        return cos === s.cosmetics ? s : { ...s, cosmetics: cos };
      });
      requestSave(); // equipped cosmetics save immediately (guest + cloud)
    },
    [requestSave],
  );

  // ─── Sound ───────────────────────────────────────────────────────────────
  // Keep the audio engine in sync with the saved settings.
  useEffect(() => {
    applySoundSettings(state.soundSettings);
  }, [state.soundSettings]);

  // Start ambient music on the first user gesture (browser autoplay policy).
  useEffect(() => {
    const onGesture = () => {
      const s = stateRef.current.soundSettings;
      if (!s.muted && s.musicEnabled) playMusic();
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, []);

  // Lower/pause music when the tab is hidden; resume when visible.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) pauseMusic();
      else resumeMusic();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const updateSoundSettings = useCallback(
    (partial: Partial<SoundSettings>) => {
      setState((s) => ({ ...s, soundSettings: { ...s.soundSettings, ...partial } }));
      requestSave();
    },
    [requestSave],
  );

  return {
    state, click, buyGenerator, buyUpgrade, claimGolden, ascend, reset,
    saveStatus, offlineEarned, dismissOffline, claimDaily,
    randomEvent, collectRandomEvent, claimQuestReward, equipCosmetic,
    soundSettings: state.soundSettings, updateSoundSettings,
    antiCheat: state.antiCheat,
    leaderboardPaused: mode === 'cloud' && state.antiCheat.flagged,
    // Galaxy Expansion
    switchGalaxyObject, unlockGalaxyObject, buyGalaxyGenerator, buyGalaxyUpgrade,
    // Backward-compatible aliases for the existing UI wiring.
    switchStar: switchGalaxyObject, buyNewStar: unlockGalaxyObject,
    buyStarGenerator: buyGalaxyGenerator, buyStarUpgrade: buyGalaxyUpgrade,
    // Buffs
    activateBuff, clearBuff,
  };
}
