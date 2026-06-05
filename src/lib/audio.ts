// Cosmic Crunch — audio engine.
//
// By default every sound is *synthesized* with the Web Audio API, so the game
// ships with NO audio files and NO copyrighted assets. To use your own files
// later, drop optimized files in /public/sounds and flip the toggles below
// (USE_SFX_FILES / MUSIC_FILE) — see /public/sounds/README.md.
//
// Everything is wrapped so it is safe during SSR and when the browser blocks
// autoplay: the AudioContext is created lazily on the first user gesture and all
// calls are no-ops / try-caught when audio is unavailable.

export type SoundName =
  | 'click' | 'buy' | 'upgrade' | 'achievement' | 'daily' | 'offline'
  | 'quest' | 'questReward' | 'event' | 'ascension' | 'error';

export type SoundSettings = {
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
};

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  muted: false,
  masterVolume: 0.7,
  musicVolume: 0.4,
  sfxVolume: 0.7,
  musicEnabled: true,
  sfxEnabled: true,
};

const LS_KEY = 'cosmic-crunch-sound';

/** Small standalone cache so the engine has volumes before game state hydrates. */
export function loadSoundSettings(): SoundSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SOUND_SETTINGS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SOUND_SETTINGS };
  } catch {
    return { ...DEFAULT_SOUND_SETTINGS };
  }
}

export function saveSoundSettings(s: SoundSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

// ── Optional real-file overrides (off by default) ───────────────────────────
const USE_SFX_FILES = false;
const SFX_FILES: Partial<Record<SoundName, string>> = {
  // click: '/sounds/click.mp3', buy: '/sounds/buy.mp3', ...
};
const MUSIC_FILE = ''; // e.g. '/sounds/ambient-loop.mp3' (empty = synthesized drone)

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicNodes: AudioNode[] = [];
  private musicEl: HTMLAudioElement | null = null;
  private musicStarted = false;
  private settings: SoundSettings = loadSoundSettings();

  private ensure(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyGains();
      return true;
    } catch {
      return false;
    }
  }

  private resume(): void {
    try {
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* autoplay policy — ignore */
    }
  }

  private applyGains(): void {
    const s = this.settings;
    const t = this.ctx?.currentTime ?? 0;
    if (this.master) this.master.gain.setTargetAtTime(s.muted ? 0 : s.masterVolume, t, 0.02);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(s.muted || !s.musicEnabled ? 0 : s.musicVolume, t, 0.05);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(s.muted || !s.sfxEnabled ? 0 : s.sfxVolume, t, 0.02);
    if (this.musicEl) this.musicEl.volume = s.muted || !s.musicEnabled ? 0 : Math.min(1, s.masterVolume * s.musicVolume);
  }

  applySettings(s: SoundSettings): void {
    this.settings = { ...s };
    saveSoundSettings(this.settings);
    if (this.ctx || this.musicEl) this.applyGains();
  }

  setMuted(v: boolean) { this.applySettings({ ...this.settings, muted: v }); }
  setMasterVolume(v: number) { this.applySettings({ ...this.settings, masterVolume: v }); }
  setMusicVolume(v: number) { this.applySettings({ ...this.settings, musicVolume: v }); }
  setSfxVolume(v: number) { this.applySettings({ ...this.settings, sfxVolume: v }); }

  // ── Synthesized SFX ──
  private tone(freq: number, dur: number, type: OscillatorType, peak: number, slideTo?: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private chord(freqs: number[], dur: number, type: OscillatorType, peak: number): void {
    for (const f of freqs) this.tone(f, dur, type, peak);
  }

  private arpeggio(freqs: number[], step: number, dur: number, type: OscillatorType, peak: number): void {
    freqs.forEach((f, i) => setTimeout(() => this.tone(f, dur, type, peak), i * step));
  }

  playSfx(name: SoundName): void {
    if (typeof window === 'undefined') return;
    if (this.settings.muted || !this.settings.sfxEnabled) return;
    if (USE_SFX_FILES && SFX_FILES[name]) return this.playFile(SFX_FILES[name] as string);
    if (!this.ensure()) return;
    this.resume();
    switch (name) {
      case 'click': this.tone(680, 0.07, 'sine', 0.5, 920); break;
      case 'buy': this.tone(440, 0.1, 'triangle', 0.4, 660); break;
      case 'upgrade': this.chord([523, 659, 784], 0.18, 'triangle', 0.3); break;
      case 'achievement': this.arpeggio([659, 880, 1318], 70, 0.18, 'triangle', 0.35); break;
      case 'daily': this.chord([587, 880], 0.22, 'sine', 0.35); break;
      case 'offline': this.tone(440, 0.4, 'sine', 0.4, 880); break;
      case 'quest': this.chord([784, 1046], 0.18, 'triangle', 0.3); break;
      case 'questReward': this.arpeggio([1046, 1318, 1568], 60, 0.16, 'sine', 0.3); break;
      case 'event': this.chord([880, 1174], 0.2, 'sine', 0.35); break;
      case 'ascension':
        this.tone(110, 0.9, 'sawtooth', 0.3, 440);
        this.chord([220, 330, 440], 0.9, 'triangle', 0.18);
        break;
      case 'error': this.tone(160, 0.16, 'square', 0.18); break;
    }
  }

  private playFile(url: string): void {
    try {
      const a = new Audio(url);
      a.volume = Math.min(1, this.settings.masterVolume * this.settings.sfxVolume);
      void a.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  // ── Ambient music ──
  playMusic(): void {
    if (typeof window === 'undefined' || this.musicStarted) return;
    if (MUSIC_FILE) {
      try {
        this.musicEl = new Audio(MUSIC_FILE);
        this.musicEl.loop = true;
        this.applyGains();
        void this.musicEl.play().catch(() => {});
        this.musicStarted = true;
      } catch {
        /* ignore */
      }
      return;
    }
    if (!this.ensure() || !this.ctx || !this.musicGain) return;
    this.resume();
    try {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      lp.connect(this.musicGain);
      [110, 164.81, 220].forEach((f, i) => {
        const o = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = (i - 1) * 6;
        g.gain.value = 0.22;
        o.connect(g);
        g.connect(lp);
        o.start();
        this.musicNodes.push(o, g);
      });
      // slow filter sweep for movement
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 0.05;
      lg.gain.value = 220;
      lfo.connect(lg);
      lg.connect(lp.frequency);
      lfo.start();
      this.musicNodes.push(lfo, lg, lp);
      this.musicStarted = true;
      this.applyGains();
    } catch {
      /* ignore */
    }
  }

  stopMusic(): void {
    if (this.musicEl) { try { this.musicEl.pause(); } catch { /* */ } this.musicEl = null; }
    for (const n of this.musicNodes) {
      try { (n as OscillatorNode).stop?.(); n.disconnect(); } catch { /* */ }
    }
    this.musicNodes = [];
    this.musicStarted = false;
  }

  pauseMusic(): void {
    if (this.musicEl) { try { this.musicEl.pause(); } catch { /* */ } return; }
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  resumeMusic(): void {
    if (this.settings.muted || !this.settings.musicEnabled) return;
    if (this.musicEl) { void this.musicEl.play().catch(() => {}); return; }
    this.resume();
    this.applyGains();
  }
}

export const audio = new AudioEngine();

export const playSfx = (n: SoundName) => audio.playSfx(n);
export const playMusic = () => audio.playMusic();
export const stopMusic = () => audio.stopMusic();
export const pauseMusic = () => audio.pauseMusic();
export const resumeMusic = () => audio.resumeMusic();
export const applySoundSettings = (s: SoundSettings) => audio.applySettings(s);
export const setMuted = (v: boolean) => audio.setMuted(v);
export const setMasterVolume = (v: number) => audio.setMasterVolume(v);
export const setMusicVolume = (v: number) => audio.setMusicVolume(v);
export const setSfxVolume = (v: number) => audio.setSfxVolume(v);
