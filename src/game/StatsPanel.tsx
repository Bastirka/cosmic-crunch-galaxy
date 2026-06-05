import { formatNumber } from './data';
import { computeCps, computeClickPower, type GameState } from './useGame';

export function StatsPanel({ state }: { state: GameState }) {
  const cps = computeCps(state);
  const click = computeClickPower(state);
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
    </div>
  );
}
