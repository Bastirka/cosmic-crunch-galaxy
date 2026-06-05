import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GameState } from './useGame';
import {
  CATALOG, CATEGORY_INFO, isCosmeticUnlocked,
  type CosmeticCategory, type CosmeticDef,
} from './cosmetics';

const TABS = CATEGORY_INFO.filter((c) => c.tab);

function Preview({ def }: { def: CosmeticDef }) {
  const v = def.visual;
  switch (def.category) {
    case 'planet_skins':
      return <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: v.gradient }} />;
    case 'backgrounds':
      return (
        <span
          className="h-9 w-9 shrink-0 rounded-md border border-white/10"
          style={{ background: v.css ? `${v.css}, #0a0a14` : '#0a0a14' }}
        />
      );
    case 'button_glows':
      return <span className="h-9 w-9 shrink-0 rounded-full bg-white/10" style={{ boxShadow: v.shadow }} />;
    case 'click_particles':
      return (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-sm" style={{ color: v.color }}>
          {v.icon ?? '+1'}
        </span>
      );
    case 'profile_badges':
    default:
      return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-lg">{v.icon}</span>;
  }
}

/** Cosmetics catalogue + equip controls, standalone for the Settings panel. */
export function CosmeticsPanel({
  state,
  onEquip,
}: {
  state: GameState;
  onEquip: (category: CosmeticCategory, id: string) => void;
}) {
  const [tab, setTab] = useState<CosmeticCategory>('planet_skins');
  const cos = state.cosmetics;

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as CosmeticCategory)}>
        <TabsList className="flex w-full flex-wrap gap-1 bg-black/30">
          {TABS.map((c) => (
            <TabsTrigger key={c.key} value={c.key} className="flex-1 text-[10px] px-1.5">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="max-h-[55vh] overflow-y-auto pr-1">
        <ul className="flex flex-col gap-2">
          {CATALOG.filter((d) => d.category === tab).map((def) => {
            const unlocked = isCosmeticUnlocked(cos, def.category, def.id);
            const equipped = cos.equipped[TABS.find((t) => t.key === def.category)!.equip] === def.id;
            return (
              <li
                key={def.id}
                className={[
                  'flex items-center gap-3 rounded-lg border px-3 py-2',
                  equipped
                    ? 'border-[color:var(--nebula-pink)] bg-[oklch(0.35_0.14_330/0.3)]'
                    : unlocked
                      ? 'border-white/8 bg-black/20'
                      : 'border-white/5 bg-black/30 opacity-60',
                ].join(' ')}
              >
                <Preview def={def} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{def.name}</p>
                  {unlocked ? (
                    <p className="truncate text-[11px] text-muted-foreground">{def.preview}</p>
                  ) : (
                    <p className="truncate text-[11px] text-[color:var(--nebula-cyan)]">
                      🔒 {def.unlockLabel ?? 'Locked'}
                    </p>
                  )}
                </div>
                {equipped ? (
                  <span className="shrink-0 rounded-md bg-[color:var(--nebula-pink)]/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[color:var(--nebula-pink)]">
                    Equipped
                  </span>
                ) : unlocked ? (
                  <button
                    onClick={() => onEquip(def.category, def.id)}
                    className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground transition hover:bg-white/10"
                  >
                    Equip
                  </button>
                ) : (
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Locked</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function CosmeticsButton({
  state,
  onEquip,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  state: GameState;
  onEquip: (category: CosmeticCategory, id: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          title="Cosmetics"
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm transition hover:bg-white/10"
        >
          🎨
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel max-w-md border-white/10 bg-black/60 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle
              className="text-center text-lg font-black uppercase tracking-[0.15em] text-[color:var(--nebula-pink)]"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Cosmetics
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Visual only — never affects your stats.
            </DialogDescription>
          </DialogHeader>

          <CosmeticsPanel state={state} onEquip={onEquip} />
        </DialogContent>
      </Dialog>
    </>
  );
}
