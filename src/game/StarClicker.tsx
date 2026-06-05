import { useState, useRef } from 'react';
import { formatNumber } from './data';

type Pop = { id: number; x: number; y: number; amount: number };

/** Max simultaneous floating numbers — keeps rapid tapping smooth on mobile. */
const MAX_POPS = 14;

export function StarClicker({
  onClick,
  power,
  planetGradient,
  glowShadow,
  particleColor,
  particleIcon,
  centerIcon,
}: {
  onClick: (e: MouseEvent) => void;
  power: number;
  planetGradient?: string;
  glowShadow?: string;
  particleColor?: string;
  particleIcon?: string;
  centerIcon?: string;
}) {
  const [pops, setPops] = useState<Pop[]>([]);
  const idRef = useRef(0);

  const handle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++idRef.current;
    // Cap concurrent floating numbers so fast tapping stays smooth on phones.
    setPops((p) => [...p.slice(-MAX_POPS + 1), { id, x, y, amount: power }]);
    setTimeout(() => setPops((p) => p.filter((pop) => pop.id !== id)), 1200);
    // Pass the native event so anti-cheat can read isTrusted + real coordinates.
    onClick(e.nativeEvent);
  };

  return (
    <div className="relative flex select-none flex-col items-center gap-6">
      <div className="relative">
        <button
          onClick={handle}
          className="star-button relative h-64 w-64 cursor-pointer touch-none select-none rounded-full outline-none transition-transform duration-75 active:scale-95 sm:h-72 sm:w-72 md:h-96 md:w-96"
          style={{ background: planetGradient, boxShadow: glowShadow }}
          aria-label="Crunch the star to harvest stardust"
        />
        {centerIcon && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="select-none text-4xl sm:text-5xl md:text-6xl"
              style={{ filter: 'drop-shadow(0 0 16px oklch(0.9 0.2 80 / 0.7))' }}
            >
              {centerIcon}
            </span>
          </div>
        )}
        {/* floating numbers */}
        <div className="pointer-events-none absolute inset-0">
          {pops.map((p) => (
            <span
              key={p.id}
              className="float-num absolute select-none text-2xl font-bold"
              style={{
                left: p.x,
                top: p.y,
                color: particleColor ?? 'var(--star-core)',
                textShadow: '0 0 12px oklch(0.85 0.22 70 / 0.9), 0 2px 4px black',
              }}
            >
              {particleIcon ? `${particleIcon} ` : '+'}{formatNumber(p.amount)}
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Click to harvest · +{formatNumber(power)} per crunch
      </p>
    </div>
  );
}
