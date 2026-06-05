import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatNumber, darkMatterFor, nextDarkMatterThreshold, ASCEND_THRESHOLD } from './data';
import type { GameState } from './useGame';

export function AscensionPanel({ state, onAscend }: { state: GameState; onAscend: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dmGain = darkMatterFor(state.totalEarned);
  const canAscend = dmGain > 0;
  const currentDM = state.darkMatter ?? 0;
  const currentBoost = currentDM * 2;
  const newBoost = (currentDM + dmGain) * 2;

  // Progress: toward the 1M threshold before the first point, then toward the next point.
  const target = canAscend ? nextDarkMatterThreshold(dmGain) : ASCEND_THRESHOLD;
  const progress = Math.min(1, state.totalEarned / target);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="px-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">Ascension</h2>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Dark Matter</dt>
        <dd className="text-right font-bold tabular-nums text-[color:var(--nebula-pink)]">{currentDM}</dd>
        <dt className="text-muted-foreground">Permanent boost</dt>
        <dd className="text-right font-bold tabular-nums text-[color:var(--nebula-pink)]">+{currentBoost}%</dd>
        <dt className="text-muted-foreground">Ascensions</dt>
        <dd className="text-right tabular-nums">{state.ascensions ?? 0}</dd>
        <dt className="text-muted-foreground">Gain now</dt>
        <dd className="text-right font-bold tabular-nums text-[color:var(--star-core)]">
          {canAscend ? `+${dmGain} DM` : '—'}
        </dd>
      </dl>

      <div>
        <div className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>{canAscend ? 'Next point' : 'To ascend'}</span>
          <span className="text-[color:var(--nebula-pink)]">
            {formatNumber(state.totalEarned)} / {formatNumber(target)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, var(--nebula-cyan), var(--nebula-pink))',
            }}
          />
        </div>
      </div>

      {canAscend ? (
        <button
          onClick={() => setConfirmOpen(true)}
          className="w-full animate-pulse rounded-lg border border-[color:var(--nebula-pink)] bg-[oklch(0.4_0.2_330/0.5)] py-2 text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--nebula-pink)] shadow-[0_0_18px_oklch(0.7_0.22_340/0.45)] transition hover:bg-[oklch(0.5_0.24_330/0.6)]"
        >
          Ascend · +{dmGain} DM
        </button>
      ) : (
        <button
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/5 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
        >
          Reach 1M total stardust earned to ascend
        </button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="glass-panel max-w-sm border-white/10 bg-black/70 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle
              className="text-center text-lg font-black uppercase tracking-[0.15em] text-[color:var(--nebula-pink)]"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Are you sure you want to ascend?
            </DialogTitle>
            <DialogDescription className="sr-only">Ascension confirmation</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You will gain</span>
              <span className="font-bold text-[color:var(--star-core)]">{dmGain} Dark Matter</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">New permanent boost</span>
              <span className="font-bold text-[color:var(--nebula-pink)]">
                +{currentBoost}% → +{newBoost}%
              </span>
            </div>
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              This will reset your current run (stardust, generators, upgrades). Achievements,
              Dark Matter and your daily streak are kept.
            </p>
          </div>

          <div className="mt-1 flex gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onAscend();
                setConfirmOpen(false);
              }}
              className="flex-1 rounded-lg border border-[color:var(--nebula-pink)] bg-[oklch(0.4_0.2_330/0.5)] py-2.5 text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--nebula-pink)] transition hover:bg-[oklch(0.5_0.24_330/0.6)]"
            >
              Ascend
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
