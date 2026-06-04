import { formatNumber, darkMatterFor, ASCEND_THRESHOLD } from './data';
import { computeCps, computeClickPower, type GameState } from './useGame';

export function StatsPanel({ state, onAscend }: { state: GameState; onAscend: () => void }) {
  const cps = computeCps(state);
  const click = computeClickPower(state);
  const dmGain = darkMatterFor(state.totalEarned);
  const canAscend = dmGain > 0;
  const progress = Math.min(1, state.totalEarned / ASCEND_THRESHOLD);
  return (
    <div className="flex flex-col gap-3">
      <h2 className="px-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">Stats</h2>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Per second</dt>
        <dd className="text-right font-bold tabular-nums text-[color:var(--nebula-cyan)]">{formatNumber(cps)}</dd>
        <dt className="text-muted-foreground">Per click</dt>
        <dd className="text-right font-bold tabular-nums text-[color:var(--star-core)]">{formatNumber(click)}</dd>
        <dt className="text-muted-foreground">Total clicks</dt>
        <dd className="text-right tabular-nums">{state.totalClicks.toLocaleString()}</dd>
        <dt className="text-muted-foreground">Total earned</dt>
        <dd className="text-right tabular-nums">{formatNumber(state.totalEarned)}</dd>
        <dt className="text-muted-foreground">All-time</dt>
        <dd className="text-right tabular-nums">{formatNumber(state.totalEarnedAllTime ?? 0)}</dd>
        <dt className="text-muted-foreground">Golden caught</dt>
        <dd className="text-right tabular-nums">{state.goldenClicks ?? 0}</dd>
        <dt className="text-muted-foreground">Ascensions</dt>
        <dd className="text-right tabular-nums">{state.ascensions ?? 0}</dd>
        <dt className="text-muted-foreground">Dark Matter</dt>
        <dd className="text-right tabular-nums text-[color:var(--nebula-pink)]">
          {state.darkMatter ?? 0} <span className="text-muted-foreground">(+{((state.darkMatter ?? 0) * 2)}%)</span>
        </dd>
      </dl>

      <div className="mt-1">
        <div className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>Ascension</span>
          <span className="text-[color:var(--nebula-pink)]">{canAscend ? `+${dmGain} DM` : `${(progress * 100).toFixed(1)}%`}</span>
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
        <button
          onClick={onAscend}
          disabled={!canAscend}
          className="mt-2 w-full rounded-lg border border-[color:var(--nebula-pink)]/50 bg-[oklch(0.3_0.15_330/0.4)] py-2 text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--nebula-pink)] transition hover:bg-[oklch(0.4_0.2_330/0.5)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          {canAscend ? `Ascend · +${dmGain} DM` : 'Locked'}
        </button>
      </div>
    </div>
  );
}
