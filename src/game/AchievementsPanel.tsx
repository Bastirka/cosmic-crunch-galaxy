import { ACHIEVEMENTS } from './data';
import type { GameState } from './useGame';

export function AchievementsPanel({ state }: { state: GameState }) {
  const unlockedCount = Object.keys(state.achievements ?? {}).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Achievements</h2>
        <span className="text-xs text-[color:var(--nebula-cyan)]">
          {unlockedCount}/{ACHIEVEMENTS.length} · +{unlockedCount}% global
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6">
        {ACHIEVEMENTS.map((a) => {
          const got = !!state.achievements?.[a.id];
          return (
            <div
              key={a.id}
              title={`${a.name} — ${a.desc}`}
              className={
                'group relative flex aspect-square items-center justify-center rounded-md border text-lg transition ' +
                (got
                  ? 'border-[color:var(--star-glow)] bg-[oklch(0.3_0.12_70/0.35)] shadow-[0_0_12px_oklch(0.85_0.22_70/0.4)]'
                  : 'border-white/5 bg-black/30 opacity-40 grayscale')
              }
            >
              <span>{got ? a.icon : '?'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
