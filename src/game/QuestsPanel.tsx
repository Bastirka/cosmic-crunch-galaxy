import { toast } from 'sonner';
import { formatNumber } from './data';
import type { Quest, QuestsState, QuestRewardType } from './quests';
import { formatQuestReward } from './quests';

export function QuestsPanel({
  quests,
  onClaim,
}: {
  quests: QuestsState;
  onClaim: (id: string) => { reward_type: QuestRewardType; reward_amount: number } | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Quests</h2>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {quests.completed_quests} done
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {quests.active_quests.map((q) => (
          <QuestCard key={q.id} quest={q} onClaim={onClaim} />
        ))}
      </div>
    </div>
  );
}

function QuestCard({
  quest,
  onClaim,
}: {
  quest: Quest;
  onClaim: (id: string) => { reward_type: QuestRewardType; reward_amount: number } | null;
}) {
  const pct = Math.max(0, Math.min(1, quest.target > 0 ? quest.current / quest.target : 0));
  const done = quest.completed;

  const handleClaim = () => {
    const r = onClaim(quest.id);
    if (r) toast('Reward claimed! 🎁', { description: `+${formatQuestReward(r.reward_type, r.reward_amount)}` });
  };

  return (
    <div
      className={[
        'rounded-xl border p-3 transition',
        done
          ? 'border-[color:var(--star-core)] bg-[oklch(0.4_0.12_85/0.25)] shadow-[0_0_16px_oklch(0.85_0.22_85/0.35)]'
          : 'border-white/8 bg-black/20',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{quest.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{quest.description}</p>
        </div>
        <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--star-core)]">
          +{quest.reward_type === 'darkMatter' ? `${quest.reward_amount} DM` : formatNumber(quest.reward_amount)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct * 100}%`,
              background: done
                ? 'var(--star-core)'
                : 'linear-gradient(90deg, var(--nebula-cyan), var(--nebula-pink))',
            }}
          />
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {formatNumber(Math.floor(quest.current))}/{formatNumber(quest.target)}
        </span>
      </div>

      {done && !quest.claimed && (
        <button
          onClick={handleClaim}
          className="mt-2 w-full rounded-lg border border-[color:var(--star-core)]/60 bg-[oklch(0.4_0.12_85/0.4)] py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--star-core)] transition hover:bg-[oklch(0.5_0.16_85/0.5)]"
        >
          Claim Reward
        </button>
      )}
    </div>
  );
}
