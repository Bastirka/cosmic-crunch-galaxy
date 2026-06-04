import { useEffect, useState } from 'react';
import { computeMultipliers, type GameState } from './useGame';

type Pos = { id: number; top: number; left: number };

export function GoldenStar({ state, onClaim }: { state: GameState; onClaim: () => void }) {
  const [star, setStar] = useState<Pos | null>(null);
  const { goldenRate } = computeMultipliers(state);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // base 3-7 min; rate multiplier halves the interval
      const baseMin = 180_000;
      const baseMax = 420_000;
      const interval = (baseMin + Math.random() * (baseMax - baseMin)) / goldenRate;
      timer = setTimeout(() => {
        setStar({
          id: Date.now(),
          top: 10 + Math.random() * 70,
          left: 5 + Math.random() * 85,
        });
        // auto-disappear after 13 seconds
        setTimeout(() => setStar(null), 13_000);
        schedule();
      }, interval);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [goldenRate]);

  if (!star) return null;
  return (
    <button
      key={star.id}
      aria-label="Click the golden star for a bonus"
      onClick={() => { onClaim(); setStar(null); }}
      className="golden-star fixed z-50 h-16 w-16 cursor-pointer"
      style={{ top: `${star.top}%`, left: `${star.left}%` }}
    >
      <span className="absolute inset-0 rounded-full" style={{
        background: 'radial-gradient(circle at 35% 35%, oklch(0.98 0.18 95), oklch(0.78 0.22 60) 55%, oklch(0.45 0.18 40) 100%)',
        boxShadow: '0 0 30px oklch(0.9 0.22 80 / 0.9), 0 0 80px oklch(0.85 0.24 60 / 0.6)',
      }} />
      <span className="absolute inset-0 flex items-center justify-center text-2xl">⭐</span>
    </button>
  );
}
