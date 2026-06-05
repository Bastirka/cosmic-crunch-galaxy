import { GameModal } from './GameModal';
import { formatNumber } from '../data';
import type { GameState } from '../useGame';
import { galaxyDef, getGalaxyUnlockProgress, getActiveGalaxyObject } from '../galaxy';

export function GalaxyMapModal({
  open,
  onOpenChange,
  state,
  onSwitchObject,
  onUnlockObject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: GameState;
  onSwitchObject: (objectId: string) => void;
  onUnlockObject: (objectId: string) => void;
}) {
  const active = getActiveGalaxyObject(state);
  const next = getGalaxyUnlockProgress(state);

  return (
    <GameModal open={open} onOpenChange={onOpenChange} title="Galaxy Map" subtitle="Unlock the next object in your cosmic chain" accent="var(--nebula-pink)" size="md">
      <div className="flex flex-col gap-3">
        {next && (
          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="uppercase tracking-[0.2em] text-muted-foreground">Next unlock</span>
              <span className="font-semibold text-[color:var(--nebula-cyan)]">{next.object.name}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>{next.def.unlockText}</span>
              <span>{formatNumber(next.current)} / {formatNumber(next.target)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full"
                style={{ width: `${next.ratio * 100}%`, background: 'linear-gradient(90deg, var(--nebula-cyan), var(--nebula-pink))' }}
              />
            </div>
          </div>
        )}

        <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
          Higher objects can support lower objects. Lower objects cannot fund higher objects.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {state.galaxy.objects.map((obj) => {
            const def = galaxyDef(obj.id)!;
            const unlocked = obj.unlocked;
            const selected = obj.id === state.galaxy.activeObjectId;
            return (
              <article
                key={obj.id}
                className={[
                  'relative overflow-hidden rounded-3xl border p-3 transition-all',
                  selected ? 'border-[color:var(--nebula-pink)] shadow-[0_0_20px_oklch(0.7_0.22_330/0.35)]' : 'border-white/10',
                  unlocked ? 'bg-black/30' : 'bg-black/50 opacity-90',
                ].join(' ')}
                style={{ boxShadow: unlocked ? def.visual.glow : undefined }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: `linear-gradient(90deg, transparent, ${selected ? 'var(--nebula-pink)' : 'transparent'}, transparent)` }}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-3xl"
                    style={{ background: def.visual.gradient }}
                  >
                    {def.visual.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black uppercase tracking-[0.08em] text-foreground">{obj.name}</h3>
                        <p className="text-[11px] text-muted-foreground">{unlocked ? 'Unlocked' : 'Locked'}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {unlocked ? 'Online' : 'Locked'}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      <span className="text-muted-foreground">Requirement</span>
                      <span className="text-right text-foreground">{def.unlockText}</span>
                      <span className="text-muted-foreground">Production</span>
                      <span className="text-right text-[color:var(--nebula-cyan)]">×{obj.productionMultiplier}</span>
                      <span className="text-muted-foreground">Upgrade cost</span>
                      <span className="text-right text-[color:var(--nebula-pink)]">×{obj.upgradeCostMultiplier}</span>
                      <span className="text-muted-foreground">Lifetime earned</span>
                      <span className="text-right tabular-nums">{formatNumber(obj.lifetimeEarned)}</span>
                      <span className="text-muted-foreground">Wallet</span>
                      <span className="text-right tabular-nums">{obj.id === 'solar_core' ? formatNumber(state.stardust) : formatNumber(obj.availableEarned)}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {obj.specialBuffs.map((buff) => (
                        <span key={buff} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {buff.replaceAll('_', ' ')}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      {unlocked ? (
                        <button
                          onClick={() => onSwitchObject(obj.id)}
                          className={[
                            'rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] transition',
                            selected
                              ? 'cursor-default border border-[color:var(--nebula-pink)] bg-[oklch(0.4_0.2_330/0.5)] text-[color:var(--nebula-pink)]'
                              : 'border border-white/10 bg-white/5 text-foreground hover:bg-white/10',
                          ].join(' ')}
                        >
                          {selected ? 'Active' : 'Select'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onUnlockObject(obj.id)}
                          disabled={!(next?.ready && next.object.id === obj.id)}
                          className="rounded-xl border border-[color:var(--nebula-pink)] bg-[oklch(0.4_0.2_330/0.5)] px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--nebula-pink)] transition enabled:hover:bg-[oklch(0.5_0.24_330/0.6)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Unlock
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[color:var(--nebula-cyan)]/20 bg-[oklch(0.2_0.06_200/0.25)] p-3 text-xs text-muted-foreground">
          Active object: <span className="text-foreground">{active.name}</span>
        </div>
      </div>
    </GameModal>
  );
}
