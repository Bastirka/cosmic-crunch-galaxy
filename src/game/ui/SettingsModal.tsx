import { useState, type ComponentProps } from 'react';
import { GameModal } from './GameModal';
import { AccountPanel } from './AccountPanel';
import { DailyRewardsPanel } from '../DailyRewards';
import { SoundSettingsPanel } from '../SoundSettingsModal';
import { CosmeticsPanel } from '../CosmeticsModal';
import { StatsPanel } from '../StatsPanel';
import type { GameState, SaveStatus } from '../useGame';
import type { SoundSettings } from '../../lib/audio';

type Category = 'daily' | 'sound' | 'stats' | 'account' | 'looks';

const CATEGORIES: { key: Category; icon: string; label: string }[] = [
  { key: 'daily', icon: '🎁', label: 'Daily' },
  { key: 'sound', icon: '🔊', label: 'Sound' },
  { key: 'stats', icon: '📊', label: 'Stats' },
  { key: 'account', icon: '🧑‍🚀', label: 'Account' },
  { key: 'looks', icon: '🎨', label: 'Looks' },
];

/**
 * Settings hub: Daily Rewards, Sound, Stats, Account and Looks (cosmetics)
 * picked via a row of category buttons. Each tab reuses an existing panel.
 */
export function SettingsModal({
  open,
  onOpenChange,
  state,
  onClaimDaily,
  soundSettings,
  onChangeSound,
  onEquipCosmetic,
  saveStatus,
  onReset,
  dailyBadge = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: GameState;
  onClaimDaily: () => void;
  soundSettings: SoundSettings;
  onChangeSound: ComponentProps<typeof SoundSettingsPanel>['onChange'];
  onEquipCosmetic: ComponentProps<typeof CosmeticsPanel>['onEquip'];
  saveStatus: SaveStatus;
  onReset: () => void;
  /** Pulse the Daily category when a reward is ready. */
  dailyBadge?: boolean;
}) {
  // Default to Daily so a ready reward is the first thing seen.
  const [cat, setCat] = useState<Category>('daily');

  return (
    <GameModal open={open} onOpenChange={onOpenChange} title="Settings" subtitle="Rewards, sound, stats, account & looks" accent="var(--nebula-cyan)">
      <div className="grid grid-cols-5 gap-1.5 pb-3">
        {CATEGORIES.map((c) => {
          const active = cat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              aria-pressed={active}
              className={[
                'relative flex flex-col items-center gap-0.5 rounded-xl border py-2 transition-all active:scale-95',
                active
                  ? 'border-[color:var(--star-glow)] bg-[oklch(0.4_0.14_300/0.5)] shadow-[0_0_14px_oklch(0.7_0.2_320/0.4)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10',
              ].join(' ')}
            >
              <span className="text-lg leading-none">{c.icon}</span>
              <span className={['text-[8px] font-semibold uppercase tracking-wide', active ? 'text-foreground' : 'text-muted-foreground'].join(' ')}>
                {c.label}
              </span>
              {c.key === 'daily' && dailyBadge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--nebula-pink)] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-black/40 bg-[color:var(--nebula-pink)]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/10 pt-3">
        {cat === 'daily' && <DailyRewardsPanel state={state} onClaim={onClaimDaily} />}
        {cat === 'sound' && <SoundSettingsPanel settings={soundSettings} onChange={onChangeSound} />}
        {cat === 'stats' && <StatsPanel state={state} />}
        {cat === 'account' && <AccountPanel saveStatus={saveStatus} onReset={onReset} />}
        {cat === 'looks' && <CosmeticsPanel state={state} onEquip={onEquipCosmetic} />}
      </div>
    </GameModal>
  );
}
