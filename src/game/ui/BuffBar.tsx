import { useEffect, useState } from 'react';
import type { GameState } from '../useGame';
import {
  getActiveBuffs, checkBuffSynergies, getSynergyHints, SYNERGIES, TEMP_BUFFS,
} from '../buffs';
import { useIsMobile } from '../../hooks/use-mobile';

function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Active-buff HUD. Pinned top-left, below the header. Shows temporary buffs with
 * live countdowns, unlocked permanent buffs, active synergy cards and one-away
 * hints. Collapses to a small pill on mobile so it never clutters the screen.
 */
export function BuffBar({ state }: { state: GameState }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(!isMobile), [isMobile]);

  const buffs = getActiveBuffs(state);
  const temp = buffs.filter((b) => b.kind === 'temp');
  const perm = buffs.filter((b) => b.kind === 'permanent');
  const synergies = checkBuffSynergies(state);
  const hints = getSynergyHints(state);

  // Nothing to show → render nothing (keeps early game clean).
  if (temp.length === 0 && perm.length === 0 && synergies.length === 0 && hints.length === 0) return null;

  const activeCount = temp.length + synergies.length;

  return (
    <div className="safe-top fixed left-0 top-12 z-20 max-w-[min(20rem,calc(100vw-1rem))] pl-2 sm:top-14">
      <div className="glass-panel overflow-hidden rounded-2xl">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-foreground">
            <span>✨</span> Buffs
            {activeCount > 0 && (
              <span className="rounded-full bg-[color:var(--nebula-pink)]/30 px-1.5 text-[10px] text-[color:var(--nebula-pink)]">
                {activeCount}
              </span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-2 pb-2">
            {/* Active synergies — special combined cards */}
            {synergies.map((id) => {
              const syn = SYNERGIES[id];
              return (
                <div
                  key={id}
                  className="rounded-xl border border-[color:var(--star-glow)] bg-[oklch(0.4_0.14_300/0.4)] p-2 shadow-[0_0_14px_oklch(0.7_0.2_320/0.4)]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{syn.icon}</span>
                    <span className="text-xs font-bold text-foreground">{syn.name}</span>
                    <span className="ml-auto rounded bg-black/30 px-1.5 text-[9px] uppercase tracking-wide text-[color:var(--star-core)]">
                      Synergy
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{TEMP_BUFFS[syn.requires[0]]?.icon ?? '•'}</span>+
                    <span>{TEMP_BUFFS[syn.requires[1]]?.icon ?? '•'}</span>
                    <span className="ml-1 truncate">{syn.shortText}</span>
                  </div>
                </div>
              );
            })}

            {/* Temporary buffs with countdowns */}
            {temp.map((b) => {
              const def = TEMP_BUFFS[b.id];
              const total = (def?.durationSeconds ?? 1) * 1000;
              const pct = Math.max(0, Math.min(1, (b.remainingMs ?? 0) / total));
              return (
                <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{b.icon}</span>
                    <span className="text-xs font-semibold text-foreground">{b.name}</span>
                    <span className="ml-auto text-[10px] font-bold tabular-nums text-[color:var(--nebula-cyan)]">
                      {fmt(b.remainingMs ?? 0)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{b.shortText}</p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct * 100}%`, background: 'linear-gradient(90deg, var(--nebula-cyan), var(--nebula-pink))' }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Permanent buffs — compact chips */}
            {perm.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {perm.map((b) => (
                  <span
                    key={b.id}
                    title={b.shortText}
                    className="flex items-center gap-1 rounded-full border border-[color:var(--star-glow)]/30 bg-[oklch(0.3_0.1_85/0.25)] px-2 py-0.5 text-[10px] text-foreground"
                  >
                    <span>{b.icon}</span>
                    <span className="text-muted-foreground">{b.shortText}</span>
                  </span>
                ))}
              </div>
            )}

            {/* One-away synergy hints */}
            {hints.map((h, i) => (
              <p key={i} className="rounded-lg border border-white/5 bg-black/20 px-2 py-1 text-[10px] text-muted-foreground">
                💡 {h}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
