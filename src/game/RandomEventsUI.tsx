import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { GameState } from './useGame';
import {
  EVENT_META, isStormActive, type ActiveRandomEvent, type EventReward, type RandomEventType,
} from './randomEvents';

/** The floating, clickable random event with a shrinking timer bar. */
export function RandomEventOverlay({
  event,
  onCollect,
}: {
  event: ActiveRandomEvent | null;
  onCollect: (type: RandomEventType) => EventReward | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!event) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [event]);

  if (!event) return null;

  const meta = EVENT_META[event.type];
  const remaining = Math.max(0, event.expiresAt - now);
  const pct = Math.max(0, Math.min(1, remaining / event.duration));

  const handleCollect = () => {
    const reward = onCollect(event.type);
    if (reward) toast(reward.message, { duration: 4500 });
  };

  return (
    <button
      key={event.id}
      onClick={handleCollect}
      aria-label={`${meta.name} — tap to collect`}
      className="fixed z-50 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95"
      style={{ top: `${event.y}%`, left: `${event.x}%`, touchAction: 'manipulation' }}
    >
      <span
        className="absolute inset-0 animate-pulse rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${meta.glow}, transparent 70%)`,
          boxShadow: `0 0 28px ${meta.glow}, 0 0 60px ${meta.glow}`,
        }}
      />
      <span className="relative text-3xl drop-shadow-lg">{meta.icon}</span>
      {/* timer bar */}
      <span className="absolute -bottom-2 left-1/2 h-1 w-14 -translate-x-1/2 overflow-hidden rounded-full bg-black/50">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, var(--nebula-cyan), var(--nebula-pink))',
          }}
        />
      </span>
    </button>
  );
}

/** "Cosmic Storm: 29s" badge while the x2 boost is active. */
export function CosmicStormIndicator({ state }: { state: GameState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!isStormActive(state, now)) return null;
  const secondsLeft = Math.ceil(((state.activeBoosts.cosmicStormUntil ?? now) - now) / 1000);

  return (
    <div
      className="fixed left-1/2 top-16 z-40 -translate-x-1/2 rounded-full border border-[color:var(--nebula-cyan)]/60 bg-black/60 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--nebula-cyan)] backdrop-blur-md"
      style={{ boxShadow: '0 0 24px oklch(0.78 0.16 200 / 0.5)' }}
    >
      🌩️ Cosmic Storm: {secondsLeft}s · x2
    </div>
  );
}
