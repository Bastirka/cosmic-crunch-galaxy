import { IconNavButton } from './IconNavButton';
import type { NavItem } from './BottomNav';

/**
 * Vertical navigation dock pinned to the left edge (desktop). Same glassy,
 * rounded, game-like styling as the bottom nav, stacked vertically so the
 * centred star stays the focus and is never covered.
 */
export function LeftDock({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <nav
      className="fixed left-0 top-1/2 z-30 -translate-y-1/2"
      style={{ paddingLeft: 'max(0.5rem, env(safe-area-inset-left))' }}
    >
      <div className="glass-panel flex flex-col items-center gap-2 rounded-[28px] px-2 py-3">
        {items.map((it) => (
          <IconNavButton
            key={it.key}
            icon={it.icon}
            label={it.label}
            active={active === it.key}
            badge={it.badge}
            onClick={() => onSelect(it.key)}
          />
        ))}
      </div>
    </nav>
  );
}
