import { UPGRADES, formatNumber } from './data';
import { isUpgradeVisible, type GameState } from './useGame';

export function UpgradesPanel({
  state,
  onBuy,
}: {
  state: GameState;
  onBuy: (u: (typeof UPGRADES)[number]) => void;
}) {
  const visible = UPGRADES.filter((u) => isUpgradeVisible(state, u));
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Upgrades {visible.length > 0 && <span className="text-[color:var(--nebula-pink)]">· {visible.length} available</span>}
      </h2>
      {visible.length === 0 && (
        <p className="glass-panel rounded-xl p-4 text-center text-sm text-muted-foreground">
          No upgrades available yet. Buy more generators to unlock them.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.slice(0, 8).map((u) => {
          const canAfford = state.stardust >= u.cost;
          return (
            <button
              key={u.id}
              disabled={!canAfford}
              onClick={() => onBuy(u)}
              className="glass-panel group flex flex-col gap-1 rounded-xl p-3 text-left transition-all enabled:hover:border-[color:var(--nebula-pink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{u.name}</span>
                <span className="shrink-0 text-xs font-bold text-[color:var(--nebula-pink)]">
                  {formatNumber(u.cost)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{u.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}