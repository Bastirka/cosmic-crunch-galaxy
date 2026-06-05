import { formatNumber } from '../data';
import type { SaveStatus } from '../useGame';
import { StatChip } from './StatChip';

const SAVE_META: Record<SaveStatus, { label: string; color: string } | null> = {
  idle: null,
  saving: { label: 'Saving', color: 'var(--nebula-cyan)' },
  saved: { label: 'Saved', color: 'var(--nebula-cyan)' },
  local: { label: 'Local', color: 'var(--star-core)' },
  error: { label: 'Error', color: 'var(--nebula-pink)' },
};

/**
 * Top HUD bar: brand on the left, core quick-stats as rounded chips on the
 * right (Stardust / CPS / Click power / Dark Matter), plus a tiny save dot.
 * Secondary stats and the account live behind nav icons, keeping this lean.
 */
export function TopBar({
  stardust,
  cps,
  power,
  darkMatter,
  saveStatus,
  badge,
}: {
  stardust: number;
  cps: number;
  power: number;
  darkMatter: number;
  saveStatus: SaveStatus;
  badge?: { icon: string; name: string } | null;
}) {
  const save = SAVE_META[saveStatus];

  return (
    <header className="safe-top sticky top-0 z-20 border-b border-white/5 bg-black/30 backdrop-blur-xl">
      <div className="safe-x mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <h1
            className="bg-gradient-to-r from-[color:var(--nebula-cyan)] via-[color:var(--star-core)] to-[color:var(--nebula-pink)] bg-clip-text text-base font-black uppercase tracking-[0.12em] text-transparent sm:text-xl sm:tracking-[0.15em]"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Cosmic Crunch
          </h1>
          {badge && (
            <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-foreground sm:inline-flex">
              <span>{badge.icon}</span>
              {badge.name}
            </span>
          )}
          {save && (
            <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.25em]" style={{ color: save.color }}>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: save.color, opacity: saveStatus === 'saving' ? 0.5 : 1 }}
              />
              <span className="hidden sm:inline">{save.label}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <StatChip icon="✦" label="Stardust" value={formatNumber(stardust)} color="var(--star-core)" emphasis />
          <StatChip label="Per sec" value={formatNumber(cps)} color="var(--nebula-cyan)" />
          <StatChip label="Per click" value={formatNumber(power)} color="var(--star-core)" />
          {darkMatter > 0 && <StatChip icon="🌑" label="Dark M." value={`${darkMatter}`} color="var(--nebula-pink)" />}
        </div>
      </div>
    </header>
  );
}
