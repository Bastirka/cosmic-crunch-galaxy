import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { playSfx, type SoundSettings } from '../lib/audio';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-foreground">{label}</span>
      {children}
    </div>
  );
}

function VolumeRow({
  label, value, disabled, onChange,
}: {
  label: string; value: number; disabled?: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className={['py-1.5', disabled ? 'opacity-40' : ''].join(' ')}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{Math.round(value * 100)}%</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={1}
        step={0.05}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

/** Sound controls, standalone so it can live inside the Settings panel. */
export function SoundSettingsPanel({
  settings,
  onChange,
}: {
  settings: SoundSettings;
  onChange: (partial: Partial<SoundSettings>) => void;
}) {
  const muteDisabled = settings.muted;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col divide-y divide-white/5">
        <Row label="Mute all">
          <Switch checked={settings.muted} onCheckedChange={(v) => onChange({ muted: v })} />
        </Row>
        <Row label="Music">
          <Switch
            checked={settings.musicEnabled}
            disabled={muteDisabled}
            onCheckedChange={(v) => onChange({ musicEnabled: v })}
          />
        </Row>
        <Row label="Sound effects">
          <Switch
            checked={settings.sfxEnabled}
            disabled={muteDisabled}
            onCheckedChange={(v) => onChange({ sfxEnabled: v })}
          />
        </Row>

        <VolumeRow label="Master volume" value={settings.masterVolume} disabled={muteDisabled} onChange={(v) => onChange({ masterVolume: v })} />
        <VolumeRow label="Music volume" value={settings.musicVolume} disabled={muteDisabled || !settings.musicEnabled} onChange={(v) => onChange({ musicVolume: v })} />
        <VolumeRow label="SFX volume" value={settings.sfxVolume} disabled={muteDisabled || !settings.sfxEnabled} onChange={(v) => onChange({ sfxVolume: v })} />
      </div>

      <button
        onClick={() => playSfx('achievement')}
        className="mt-2 w-full rounded-lg border border-[color:var(--nebula-cyan)]/40 bg-[oklch(0.3_0.1_200/0.35)] py-2 text-sm font-semibold text-foreground transition hover:bg-[oklch(0.4_0.14_200/0.45)]"
      >
        🔔 Test sound
      </button>
    </div>
  );
}

export function SoundSettingsButton({
  settings,
  onChange,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  settings: SoundSettings;
  onChange: (partial: Partial<SoundSettings>) => void;
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
          title="Sound settings"
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm transition hover:bg-white/10"
        >
          {settings.muted ? '🔇' : '🔊'}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel max-w-sm border-white/10 bg-black/60 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle
              className="text-center text-lg font-black uppercase tracking-[0.15em] text-[color:var(--nebula-cyan)]"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Sound
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Music & effects settings
            </DialogDescription>
          </DialogHeader>

          <SoundSettingsPanel settings={settings} onChange={onChange} />
        </DialogContent>
      </Dialog>
    </>
  );
}
