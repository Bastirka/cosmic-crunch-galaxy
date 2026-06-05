import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/**
 * Consistent pop-up panel used across the game. Wraps the shared Dialog with
 * the Cosmic Crunch glass styling, a centred Orbitron title and a scrollable
 * body. Closes via the built-in ✕, overlay click or Escape.
 */
export function GameModal({
  open,
  onOpenChange,
  title,
  subtitle,
  accent = 'var(--star-core)',
  size = 'md',
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  /** Title colour — lets each system keep its identity. */
  accent?: string;
  size?: 'sm' | 'md';
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          'glass-panel flex max-h-[82vh] flex-col border-white/10 bg-black/60 backdrop-blur-xl',
          size === 'sm' ? 'max-w-sm' : 'max-w-md',
        ].join(' ')}
      >
        <DialogHeader>
          <DialogTitle
            className="text-center text-lg font-black uppercase tracking-[0.15em]"
            style={{ fontFamily: "'Orbitron', sans-serif", color: accent }}
          >
            {title}
          </DialogTitle>
          <DialogDescription className={subtitle ? 'text-center text-xs text-muted-foreground' : 'sr-only'}>
            {subtitle ?? title}
          </DialogDescription>
        </DialogHeader>
        <div className="-mr-1 overflow-y-auto pr-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
