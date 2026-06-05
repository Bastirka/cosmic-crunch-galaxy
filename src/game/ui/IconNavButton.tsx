import type { ReactNode } from 'react';

/**
 * Large rounded-square icon button for the game navigation dock.
 * Big tap target, icon + short label, active highlight, optional "attention"
 * badge (e.g. a reward is ready to claim).
 */
export function IconNavButton({
  icon,
  label,
  active = false,
  badge = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={[
        'group relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border',
        'h-[58px] w-[58px] transition-all duration-150 active:scale-90 sm:h-16 sm:w-16',
        active
          ? 'border-[color:var(--star-glow)] bg-[oklch(0.4_0.14_300/0.55)] shadow-[0_0_18px_oklch(0.7_0.2_320/0.5)]'
          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10',
      ].join(' ')}
    >
      <span
        className={[
          'text-[22px] leading-none transition-transform group-hover:scale-110 group-active:scale-90 sm:text-2xl',
          active ? 'drop-shadow-[0_0_8px_oklch(0.85_0.2_320/0.85)]' : '',
        ].join(' ')}
      >
        {icon}
      </span>
      <span
        className={[
          'text-[8px] font-semibold uppercase tracking-wide sm:text-[9px]',
          active ? 'text-foreground' : 'text-muted-foreground',
        ].join(' ')}
      >
        {label}
      </span>

      {badge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--nebula-pink)] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full border border-black/40 bg-[color:var(--nebula-pink)]" />
        </span>
      )}
    </button>
  );
}
