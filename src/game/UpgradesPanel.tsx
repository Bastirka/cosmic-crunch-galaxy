import { UPGRADES, formatNumber } from './data';
import { isUpgradeVisible, type GameState } from './useGame';

export function UpgradesPanel({
  state,
  onBuy,
}: {
  state: GameState;
  onBuy: (u: (typeof UPGRADES)[number]) => void;
}) {
  const visible = UPGRADES.filter((u) => isUpgradeVisible(state, u)).sort((a, b) => a.cost - b.cost);
  const affordable = visible.filter((u) => state.stardust >= u.cost);
  const next = visible.filter((u) => state.stardust < u.cost).slice(0, 6);
  const list = [...affordable, ...next];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Upgrades</h2>
        <span className="text-xs text-[color:var(--nebula-pink)]">
          {affordable.length} ready · {visible.length} unlocked
        </span>
      </div>
      {list.length === 0 && (
        <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-center text-sm text-muted-foreground">
          Buy more generators to unlock upgrades.
        </p>
      )}
      <div className="grid grid-cols-1 gap-1.5">
        {list.map((u) => {
          const canAfford = state.stardust >= u.cost;
          return (
            <button
              key={u.id}
              disabled={!canAfford}
              onClick={() => onBuy(u)}
              className={
                'group flex items-center gap-2 rounded-lg border p-2 text-left transition-all ' +
                (canAfford
                  ? 'border-[color:var(--nebula-pink)]/40 bg-[oklch(0.3_0.12_330/0.25)] hover:bg-[oklch(0.35_0.16_330/0.4)] cursor-pointer'
                  : 'border-white/5 bg-black/30 opacity-50 cursor-not-allowed')
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{u.name}</span>
                  <span className="shrink-0 text-xs font-bold text-[color:var(--nebula-pink)] tabular-nums">
                    {formatNumber(u.cost)}
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{u.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}