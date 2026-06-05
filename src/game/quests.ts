import { computeCps, type GameState } from './useGame';
import { GENERATORS, formatNumber } from './data';

export type QuestRewardType = 'stardust' | 'darkMatter';

export type Quest = {
  id: string;
  type: string;
  title: string;
  description: string;
  current: number;
  target: number;
  reward_type: QuestRewardType;
  reward_amount: number;
  completed: boolean;
  claimed: boolean;
  created_at: string;
  metadata?: { generatorId?: string };
};

export type QuestsState = {
  active_quests: Quest[];
  completed_quests: number;
  total_quest_rewards_claimed: number;
  last_quest_generated_at: string;
};

export const ACTIVE_QUEST_COUNT = 3;

/** Game events that drive quest progress. */
export type QuestEvent =
  | 'click' | 'earn' | 'buyGenerator' | 'buyUpgrade'
  | 'goldenComet' | 'randomEvent' | 'daily' | 'ascend' | 'darkMatter' | 'offline';

export const defaultQuests = (): QuestsState => ({
  active_quests: [],
  completed_quests: 0,
  total_quest_rewards_claimed: 0,
  last_quest_generated_at: '',
});

type Difficulty = 'easy' | 'medium' | 'hard';
const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
const randBetween = (min: number, max: number) => min + Math.random() * (max - min);

/** Map a quest's type to the event that advances it. */
export function questEventFor(type: string): QuestEvent {
  switch (type) {
    case 'buyGeneratorSpecific': return 'buyGenerator';
    default: return type as QuestEvent;
  }
}

// ─── Quest templates ──────────────────────────────────────────────────────
type Built = { target: number; title: string; description: string; metadata?: { generatorId?: string } };
type Template = {
  type: string;
  available: (s: GameState) => boolean;
  build: (s: GameState, d: Difficulty) => Built;
};

const tiered = <T,>(d: Difficulty, easy: T, medium: T, hard: T) =>
  d === 'easy' ? easy : d === 'medium' ? medium : hard;

const earnTargetFor = (s: GameState, d: Difficulty) =>
  Math.max(1000, Math.floor(computeCps(s) * 60 * tiered(d, 5, 30, 120)));

const TEMPLATES: Template[] = [
  {
    type: 'click',
    available: () => true,
    build: (_s, d) => {
      const target = tiered(d, 100, 500, 2000);
      return { target, title: `Click ${target.toLocaleString()} times`, description: 'Tap the cosmic core.' };
    },
  },
  {
    type: 'earn',
    available: () => true,
    build: (s, d) => {
      const target = earnTargetFor(s, d);
      return { target, title: `Earn ${formatNumber(target)} stardust`, description: 'Accumulate stardust from any source.' };
    },
  },
  {
    type: 'buyGenerator',
    available: () => true,
    build: (_s, d) => {
      const target = tiered(d, 5, 15, 40);
      return { target, title: `Buy ${target} generators`, description: 'Purchase any generators.' };
    },
  },
  {
    type: 'buyGeneratorSpecific',
    available: (s) => GENERATORS.some((g) => (s.generators[g.id] ?? 0) > 0),
    build: (s, d) => {
      const owned = GENERATORS.filter((g) => (s.generators[g.id] ?? 0) > 0);
      const g = owned[randInt(0, owned.length - 1)] ?? GENERATORS[0];
      const target = tiered(d, 5, 10, 25);
      return {
        target,
        title: `Buy ${target} ${g.name}`,
        description: `Expand your fleet of ${g.name}.`,
        metadata: { generatorId: g.id },
      };
    },
  },
  {
    type: 'buyUpgrade',
    available: () => true,
    build: (_s, d) => {
      const target = tiered(d, 3, 8, 20);
      return { target, title: `Buy ${target} upgrades`, description: 'Unlock production upgrades.' };
    },
  },
  {
    type: 'goldenComet',
    available: () => true,
    build: (_s, d) => {
      const target = tiered(d, 1, 3, 7);
      return { target, title: `Collect ${target} Golden Comet${target > 1 ? 's' : ''}`, description: 'Catch golden comets when they appear.' };
    },
  },
  {
    type: 'randomEvent',
    available: () => true,
    build: (_s, d) => {
      const target = tiered(d, 2, 5, 12);
      return { target, title: `Collect ${target} cosmic events`, description: 'Click any random events on screen.' };
    },
  },
  {
    type: 'daily',
    available: () => true,
    build: (_s, d) => {
      const target = tiered(d, 1, 3, 7);
      return { target, title: `Claim daily reward ${target}×`, description: 'Return and claim your daily reward.' };
    },
  },
  {
    type: 'ascend',
    available: (s) => (s.ascensions ?? 0) > 0 || (s.totalEarnedAllTime ?? 0) > 1_000_000,
    build: (_s, d) => {
      const target = tiered(d, 1, 1, 3);
      return { target, title: `Ascend ${target} time${target > 1 ? 's' : ''}`, description: 'Reset your run for Dark Matter.' };
    },
  },
  {
    type: 'darkMatter',
    available: (s) => (s.ascensions ?? 0) > 0,
    build: (_s, d) => {
      const target = tiered(d, 1, 5, 20);
      return { target, title: `Gain ${target} Dark Matter`, description: 'Earn Dark Matter through ascension.' };
    },
  },
  {
    type: 'offline',
    available: () => true,
    build: (s, d) => {
      const target = earnTargetFor(s, d);
      return { target, title: `Earn ${formatNumber(target)} stardust offline`, description: 'Collect offline earnings when you return.' };
    },
  },
];

/** New players get easy quests; difficulty ramps with lifetime progress. */
function pickDifficulty(s: GameState): Difficulty {
  const te = s.totalEarnedAllTime ?? 0;
  if (te < 10_000) return 'easy';
  const adv = (s.ascensions ?? 0) > 0 || te > 10_000_000;
  const r = Math.random();
  if (adv) return r < 0.3 ? 'easy' : r < 0.7 ? 'medium' : 'hard';
  return r < 0.6 ? 'easy' : r < 0.92 ? 'medium' : 'hard';
}

/**
 * Reward scales with current CPS: reward = max(floor, cps * minutes * 60).
 * Easy 2–5 min · Medium 10–20 min · Hard 30–60 min. Hard quests have a small
 * chance to award 1 Dark Matter once ascension is unlocked.
 */
function computeQuestReward(s: GameState, d: Difficulty): { reward_type: QuestRewardType; reward_amount: number } {
  if (d === 'hard' && (s.ascensions ?? 0) > 0 && Math.random() < 0.1) {
    return { reward_type: 'darkMatter', reward_amount: 1 };
  }
  const minutes = tiered(d, randBetween(2, 5), randBetween(10, 20), randBetween(30, 60));
  const floor = tiered(d, 100, 500, 2000);
  const amount = Math.max(floor, Math.floor(computeCps(s) * minutes * 60));
  return { reward_type: 'stardust', reward_amount: amount };
}

const uid = () => `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** Generate one quest that does not duplicate (type+target+generator) of `existing`. */
export function generateQuest(state: GameState, existing: Quest[]): Quest {
  const avail = TEMPLATES.filter((t) => t.available(state));
  let built: Built | null = null;
  let template = avail[0];

  for (let i = 0; i < 25; i++) {
    const t = avail[randInt(0, avail.length - 1)];
    const b = t.build(state, pickDifficulty(state));
    const dupe = existing.some(
      (q) => q.type === t.type && q.target === b.target && q.metadata?.generatorId === b.metadata?.generatorId,
    );
    if (!dupe) { template = t; built = b; break; }
    template = t; built = b; // keep last as fallback
  }

  const b = built ?? template.build(state, 'easy');
  const reward = computeQuestReward(state, pickDifficulty(state));
  return {
    id: uid(),
    type: template.type,
    title: b.title,
    description: b.description,
    current: 0,
    target: b.target,
    reward_type: reward.reward_type,
    reward_amount: reward.reward_amount,
    completed: false,
    claimed: false,
    created_at: new Date().toISOString(),
    metadata: b.metadata,
  };
}

/** Ensure the player always has ACTIVE_QUEST_COUNT active quests. */
export function ensureActiveQuests(state: GameState): QuestsState {
  const base = state.quests ?? defaultQuests();
  if (base.active_quests.length >= ACTIVE_QUEST_COUNT) return base;
  const active = [...base.active_quests];
  while (active.length < ACTIVE_QUEST_COUNT) active.push(generateQuest(state, active));
  return { ...base, active_quests: active, last_quest_generated_at: new Date().toISOString() };
}

/** Generate a fresh set of initial quests. */
export function generateInitialQuests(state: GameState): QuestsState {
  return ensureActiveQuests({ ...state, quests: defaultQuests() });
}

/**
 * Advance quest progress for an event. Pure — returns the same object when
 * nothing changed so callers can skip needless re-renders.
 */
export function updateQuestProgress(
  quests: QuestsState,
  event: QuestEvent,
  amount: number,
  metadata?: { generatorId?: string },
): QuestsState {
  if (amount <= 0) return quests;
  let changed = false;
  const active = quests.active_quests.map((q) => {
    if (q.completed || q.claimed) return q;
    if (questEventFor(q.type) !== event) return q;
    if (q.type === 'buyGeneratorSpecific' && q.metadata?.generatorId !== metadata?.generatorId) return q;
    const current = Math.min(q.target, q.current + amount);
    if (current === q.current) return q;
    changed = true;
    return { ...q, current, completed: current >= q.target };
  });
  return changed ? { ...quests, active_quests: active } : quests;
}

/** Display string for a quest reward. */
export function formatQuestReward(type: QuestRewardType, amount: number): string {
  return type === 'darkMatter' ? `${amount} Dark Matter` : `${formatNumber(amount)} stardust`;
}
