import { GENERATORS, generatorCost, formatNumber } from './data';
import { computeMultipliers, type GameState } from './useGame';

export function GeneratorsPanel({
  state,
  onBuy,
}: {
  state: GameState;
  onBuy: (g: (typeof GENERATORS)[number]) => void;
}) {
  const { genMult, globalMult } = computeMultipliers(state);
  const firstLockedIdx = GENERATORS.findIndex(
    (g) => (state.generators[g.id] ?? 0) === 0 && state.totalEarned < g.baseCost * 0.5,
  );

  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">Generators</h2>
      {GENERATORS.map((g, i) => {
        const owned = state.generators[g.id] ?? 0;
        const cost = generatorCost(g, owned);
        const canAfford = state.stardust >= cost;
        const locked = firstLockedIdx !== -1 && i > firstLockedIdx;
        const cps = g.baseCps * (genMult[g.id] ?? 1) * globalMult;
        return (
          <button
            key={g.id}
            disabled={!canAfford || locked}
            onClick={() => onBuy(g)}
            className="glass-panel group flex items-center gap-3 rounded-xl p-3 text-left transition-all enabled:hover:border-[color:var(--star-glow)] enabled:hover:bg-[oklch(0.25_0.07_280/0.6)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.15_0.05_275)] text-2xl">
              {locked ? '🔒' : g.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{locked ? '???' : g.name}</span>
                <span className="shrink-0 text-sm font-bold text-[color:var(--star-core)]">
                  {formatNumber(cost)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">
                  {locked ? 'Locked' : `+${formatNumber(cps)}/s each`}
                </span>
                <span className="shrink-0 tabular-nums text-[color:var(--nebula-cyan)]">×{owned}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}