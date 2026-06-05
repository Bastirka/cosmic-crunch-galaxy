import { GENERATORS, UPGRADES, formatNumber } from '../data';
import type { GameState } from '../useGame';
import {
  ambientGlobalMult,
  calculateGalaxyObjectProduction,
  galaxyDef,
  galaxyGeneratorCost,
  galaxyGeneratorCps,
  galaxyUpgradeCost,
  getActiveGalaxyObject,
  getGalaxyUnlockProgress,
  isGalaxyUpgradeVisible,
  type GalaxyObject,
} from '../galaxy';

/** Horizontal selector for switching which galaxy object you're managing. */
export function StarSelector({
  state,
  onSwitch,
  className = '',
}: {
  state: GameState;
  onSwitch: (objectId: string) => void;
  className?: string;
}) {
  const active = getActiveGalaxyObject(state);
  const ambient = ambientGlobalMult(state);
  return (
    <div className={['flex flex-wrap items-center justify-center gap-1.5', className].join(' ')}>
      {state.galaxy.objects.map((obj) => {
        const def = galaxyDef(obj.id);
        const selected = obj.id === state.galaxy.activeObjectId;
        const cps = obj.id === 'solar_core' ? null : calculateGalaxyObjectProduction(obj, ambient);
        return (
          <button
            key={obj.id}
            disabled={!obj.unlocked}
            onClick={() => onSwitch(obj.id)}
            aria-pressed={selected}
            className={[
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all active:scale-95',
              selected
                ? 'border-[color:var(--star-glow)] bg-[oklch(0.4_0.14_300/0.5)] text-foreground shadow-[0_0_14px_oklch(0.7_0.2_320/0.4)]'
                : obj.unlocked
                  ? 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                  : 'border-white/10 bg-black/20 text-muted-foreground/70 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            <span className="text-sm leading-none">{def?.visual.icon ?? '⭐'}</span>
            <span className="font-semibold">{obj.name}</span>
            {cps != null && <span className="tabular-nums text-[color:var(--nebula-cyan)]">+{formatNumber(cps)}/s</span>}
            {selected && active.id === obj.id && <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--star-core)]">Active</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Generators list for a single galaxy object, paid from that object's wallet. */
export function StarGeneratorsPanel({
  state,
  star,
  onBuy,
}: {
  state: GameState;
  star: GalaxyObject;
  onBuy: (objectId: string, def: (typeof GENERATORS)[number]) => void;
}) {
  const ambient = ambientGlobalMult(state);
  const isSolar = star.id === 'solar_core';
  return (
    <div className="flex flex-col gap-2">
      <WalletNote star={star} />
      {GENERATORS.map((g) => {
        const owned = star.generators[g.id] ?? 0;
        const cost = galaxyGeneratorCost(star, g);
        const canAfford = star.availableEarned >= cost;
        const cps = galaxyGeneratorCps(star, g, ambient);
        return (
          <button
            key={g.id}
            disabled={!canAfford || isSolar}
            onClick={() => onBuy(star.id, g)}
            className="glass-panel group flex items-center gap-3 rounded-xl p-3 text-left transition-all enabled:hover:border-[color:var(--star-glow)] enabled:hover:bg-[oklch(0.25_0.07_280/0.6)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.15_0.05_275)] text-2xl">
              {g.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{g.name}</span>
                <span className="shrink-0 text-sm font-bold text-[color:var(--star-core)]">{formatNumber(cost)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">+{formatNumber(cps)}/s each</span>
                <span className="shrink-0 tabular-nums text-[color:var(--nebula-cyan)]">×{owned}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Upgrades list for a single galaxy object, paid from that object's wallet. */
export function StarUpgradesPanel({
  star,
  onBuy,
}: {
  star: GalaxyObject;
  onBuy: (objectId: string, u: (typeof UPGRADES)[number]) => void;
}) {
  const visible = UPGRADES.filter((u) => isGalaxyUpgradeVisible(star, u)).sort(
    (a, b) => galaxyUpgradeCost(star, a) - galaxyUpgradeCost(star, b),
  );
  const affordable = visible.filter((u) => star.availableEarned >= galaxyUpgradeCost(star, u));
  const next = visible.filter((u) => star.availableEarned < galaxyUpgradeCost(star, u)).slice(0, 6);
  const list = [...affordable, ...next];

  return (
    <div className="flex flex-col gap-2">
      <WalletNote star={star} />
      {list.length === 0 && (
        <p className="rounded-xl border border-white/5 bg-black/20 p-4 text-center text-sm text-muted-foreground">
          Buy more generators for {star.name} to unlock upgrades.
        </p>
      )}
      <div className="grid grid-cols-1 gap-1.5">
        {list.map((u) => {
          const cost = galaxyUpgradeCost(star, u);
          const canAfford = star.availableEarned >= cost;
          return (
            <button
              key={u.id}
              disabled={!canAfford}
              onClick={() => onBuy(star.id, u)}
              className={
                'group flex items-center gap-2 rounded-lg border p-2 text-left transition-all ' +
                (canAfford
                  ? 'border-[color:var(--nebula-pink)]/40 bg-[oklch(0.3_0.12_330/0.25)] hover:bg-[oklch(0.35_0.16_330/0.4)] cursor-pointer'
                  : 'border-white/5 bg-black/30 opacity-50 cursor-not-allowed')
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{u.name}</span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-[color:var(--nebula-pink)]">
                    {formatNumber(cost)}
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{u.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The source-spending reminder for the currently selected object. */
function WalletNote({ star }: { star: GalaxyObject }) {
  return (
    <div className="rounded-lg border border-[color:var(--nebula-cyan)]/30 bg-[oklch(0.3_0.1_200/0.2)] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{star.name} earnings</span>
        <span className="text-sm font-bold tabular-nums text-[color:var(--nebula-cyan)]">
          {star.id === 'solar_core' ? 'Main pool' : formatNumber(star.availableEarned)}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {star.id === 'solar_core'
          ? 'Solar Core upgrades use the main Stardust pool.'
          : `${star.name} upgrades require ${star.name} earnings. Higher objects also support lower objects.`}
      </p>
    </div>
  );
}

/** Preview + unlock button for the next galaxy object. */
export function BuyNewStarCard({
  state,
  onBuyNew,
}: {
  state: GameState;
  onBuyNew: () => void;
}) {
  const progress = getGalaxyUnlockProgress(state);
  if (!progress) return null;

  const { object, def, current, target, ratio, ready } = progress;
  const affordable = ready;

  return (
    <div className="mt-2 rounded-2xl border border-[color:var(--nebula-pink)]/40 bg-[oklch(0.3_0.12_330/0.2)] p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{def.visual.icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Next unlock: {object.name}</p>
          <p className="text-[11px] text-muted-foreground">{def.unlockText}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>Progress</span>
          <span className="text-[color:var(--nebula-pink)]">
            {formatNumber(current)} / {formatNumber(target)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${ratio * 100}%`, background: 'linear-gradient(90deg, var(--nebula-cyan), var(--nebula-pink))' }}
          />
        </div>
      </div>

      <button
        onClick={onBuyNew}
        disabled={!affordable}
        className="mt-3 w-full rounded-xl border border-[color:var(--nebula-pink)] bg-[oklch(0.4_0.2_330/0.5)] py-2.5 text-sm font-bold uppercase tracking-[0.2em] text-[color:var(--nebula-pink)] transition enabled:hover:bg-[oklch(0.5_0.24_330/0.6)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {affordable ? `Unlock ${object.name}` : `Need ${formatNumber(target)} Stardust`}
      </button>
    </div>
  );
}
