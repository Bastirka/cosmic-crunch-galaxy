import type { ReactNode } from 'react';

/**
 * Compact rounded stat pill used in the top HUD bar.
 * Shows a small label over a bold value, with an optional leading icon.
 */
export function StatChip({
  icon,
  label,
  value,
  color = 'var(--foreground)',
  emphasis = false,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  color?: string;
  /** Larger pill for the primary currency. */
  emphasis?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md',
        emphasis ? 'px-3 py-1 sm:px-3.5' : 'px-2.5 py-1',
      ].join(' ')}
    >
      {icon && <span className={emphasis ? 'text-base leading-none' : 'text-sm leading-none'}>{icon}</span>}
      <div className="flex flex-col items-start leading-none">
        <span className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
        <span
          className={['font-bold tabular-nums', emphasis ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'].join(' ')}
          style={{ color }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
