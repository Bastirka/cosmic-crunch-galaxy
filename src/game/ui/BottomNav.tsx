import type { ReactNode } from 'react';
import { IconNavButton } from './IconNavButton';

export type NavItem = {
  key: string;
  icon: ReactNode;
  label: string;
  badge?: boolean;
};

/**
 * Floating, glassy navigation dock pinned to the lower-centre of the screen.
 * Works as a bottom nav on mobile and a compact centre dock on desktop.
 * It only renders the items it is given — overflow handling (a "More" entry)
 * is decided by the caller so badge logic stays in one place.
 */
export function BottomNav({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <nav className="safe-bottom safe-x pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-2">
      <div className="glass-panel pointer-events-auto flex items-center gap-1.5 rounded-[28px] px-2 py-2 sm:gap-2 sm:px-3">
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
