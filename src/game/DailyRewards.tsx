import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatNumber } from './data';
import type { GameState } from './useGame';
import {
  getDailyStatus, computeDailyReward, formatCountdown, DAILY_MINUTES, MAX_STREAK,
} from './daily';

/** Short label for a day's reward, e.g. "5m", "1h", "4h +DM". */
function rewardLabel(day: number): string {
  const minutes = DAILY_MINUTES[day - 1];
  const base = minutes < 60 ? `${minutes}m` : `${minutes / 60}h`;
  return day === MAX_STREAK ? `${base} +DM` : base;
}

/**
 * Daily-reward calendar + claim button. Standalone so it can live inside the
 * Settings panel as well as its own modal.
 */
export function DailyRewardsPanel({ state, onClaim }: { state: GameState; onClaim: () => void }) {
  // Re-render every second so the countdown / availability stays live.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const status = getDailyStatus(state.dailyRewards, now);
  const reward = computeDailyReward(state, status.claimDay);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {Array.from({ length: MAX_STREAK }, (_, i) => {
          const day = i + 1;
          const isCompleted = day <= status.completed;
          const isClaimable = status.canClaim && day === status.claimDay;
          const isNext = !status.canClaim && day === status.claimDay;

          return (
            <div
              key={day}
              className={[
                'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-center transition',
                isClaimable
                  ? 'border-[color:var(--star-core)] bg-[oklch(0.4_0.12_85/0.35)] shadow-[0_0_18px_oklch(0.85_0.22_85/0.45)]'
                  : isCompleted
                    ? 'border-[color:var(--nebula-cyan)]/40 bg-[oklch(0.3_0.1_200/0.3)]'
                    : isNext
                      ? 'border-white/20 bg-white/5'
                      : 'border-white/5 bg-black/20 opacity-50',
              ].join(' ')}
            >
              <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Day {day}</span>
              <span className="text-sm">{isCompleted ? '✓' : isClaimable ? '🎁' : '🔒'}</span>
              <span className="text-[9px] font-semibold tabular-nums text-foreground">{rewardLabel(day)}</span>
            </div>
          );
        })}
      </div>

      {status.canClaim ? (
        <button
          onClick={() => {
            onClaim();
            setNow(Date.now());
          }}
          className="mt-1 w-full rounded-lg border border-[color:var(--star-core)]/60 bg-[oklch(0.4_0.12_85/0.4)] py-2.5 text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--star-core)] transition hover:bg-[oklch(0.5_0.16_85/0.5)]"
        >
          Claim Day {status.claimDay} · {formatNumber(reward.stardust)}
          {reward.darkMatter > 0 ? ` +${reward.darkMatter} DM` : ''}
        </button>
      ) : (
        <button
          disabled
          className="mt-1 w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground"
        >
          Claimed · Come back in {formatCountdown(status.msUntilNext)}
        </button>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        Streak: {status.completed} / {MAX_STREAK} · Total claims: {state.dailyRewards.total_daily_claims}
      </p>
    </div>
  );
}

export function DailyRewardsButton({
  state,
  onClaim,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  state: GameState;
  onClaim: () => void;
  /** Controlled-open support so an external nav can drive the modal. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const status = getDailyStatus(state.dailyRewards);

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          title="Daily Reward"
          className="relative rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm transition hover:bg-white/10"
        >
          🎁
          {status.canClaim && (
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--nebula-pink)] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--nebula-pink)]" />
            </span>
          )}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel max-w-md border-white/10 bg-black/60 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle
              className="text-center text-lg font-black uppercase tracking-[0.15em] text-[color:var(--star-core)]"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Daily Reward
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Come back every day — bigger rewards each day for 7 days.
            </DialogDescription>
          </DialogHeader>

          <DailyRewardsPanel state={state} onClaim={onClaim} />
        </DialogContent>
      </Dialog>
    </>
  );
}
