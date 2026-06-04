import { useState, useRef } from 'react';
import { formatNumber } from './data';

type Pop = { id: number; x: number; y: number; amount: number };

export function StarClicker({ onClick, power }: { onClick: () => void; power: number }) {
  const [pops, setPops] = useState<Pop[]>([]);
  const idRef = useRef(0);

  const handle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++idRef.current;
    setPops((p) => [...p, { id, x, y, amount: power }]);
    setTimeout(() => setPops((p) => p.filter((pop) => pop.id !== id)), 1200);
    onClick();
  };

  return (
    <div className="relative flex flex-col items-center gap-6">
      <div className="relative">
        <button
          onClick={handle}
          className="star-button relative h-72 w-72 rounded-full transition-transform duration-75 active:scale-95 md:h-96 md:w-96 cursor-pointer outline-none"
          aria-label="Crunch the star to harvest stardust"
        />
        {/* floating numbers */}
        <div className="pointer-events-none absolute inset-0">
          {pops.map((p) => (
            <span
              key={p.id}
              className="float-num absolute select-none text-2xl font-bold text-[color:var(--star-core)]"
              style={{
                left: p.x,
                top: p.y,
                textShadow: '0 0 12px oklch(0.85 0.22 70 / 0.9), 0 2px 4px black',
              }}
            >
              +{formatNumber(p.amount)}
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