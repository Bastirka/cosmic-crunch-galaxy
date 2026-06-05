// Anti auto-clicker / anti-cheat.
//
// Two layers:
//  1. A *runtime* tracker (timestamps + positions, never saved) used to measure
//     click rate and detect robotic patterns in the current session.
//  2. A *persisted* AntiCheatState (counters + flag) saved with the game.
//
// Philosophy: never break normal play. Humans can burst-click; we only cap
// rewards above clearly inhuman rates and flag sustained scripted patterns.

export type AntiCheatState = {
  suspicious_clicks: number;
  blocked_clicks: number;
  max_cps_detected: number;
  warnings: number;
  last_warning_at: string | null;
  flagged: boolean;
};

export const defaultAntiCheat = (): AntiCheatState => ({
  suspicious_clicks: 0,
  blocked_clicks: 0,
  max_cps_detected: 0,
  warnings: 0,
  last_warning_at: null,
  flagged: false,
});

/** Minimal shape of the data we read from a click event. */
export type ClickInput = { isTrusted?: boolean; clientX?: number; clientY?: number } | null | undefined;

/** Per-session, non-persisted state. Held in a ref. */
export type ClickTracker = {
  times: number[];
  xs: number[];
  ys: number[];
  blockUntil: number;   // rewards fully blocked until this ms timestamp
  reducedUntil: number; // rewards halved until this ms timestamp
  lastWarnAt: number;   // last warning toast (for 10s cooldown)
};

export const createClickTracker = (): ClickTracker => ({
  times: [], xs: [], ys: [], blockUntil: 0, reducedUntil: 0, lastWarnAt: 0,
});

// ── Tuning ──
const MAX_SAMPLES = 50;
const SOFT_CPS = 8;     // ≤8 cps: always fine
const HARD_CPS = 15;    // ≥15 cps: cap rewards toward SAFE_CPS
const EXTREME_CPS = 25; // >25 cps: block almost all reward
const SAFE_CPS = 8;     // rewarded clicks/sec ceiling once capping kicks in
export const WARNING_COOLDOWN_MS = 10_000;

export type Severity = 'ok' | 'suspicious' | 'severe';
export type ClickValidation = {
  allowed: boolean;
  rewardMultiplier: number;
  cps: number;
  severity: Severity;
  reason?: string;
};

/** Append a click sample, trimming to the last MAX_SAMPLES. */
export function recordClickTiming(t: ClickTracker, ts: number, x: number, y: number): void {
  t.times.push(ts); t.xs.push(x); t.ys.push(y);
  if (t.times.length > MAX_SAMPLES) { t.times.shift(); t.xs.shift(); t.ys.shift(); }
}

/** Clicks within the last 1000ms. */
export function getRecentClicksPerSecond(t: ClickTracker, now = Date.now()): number {
  let c = 0;
  for (let i = t.times.length - 1; i >= 0; i--) {
    if (now - t.times[i] <= 1000) c++;
    else break;
  }
  return c;
}

/**
 * Look for non-human signatures in recent clicks:
 *  - robotic: near-zero variance between intervals (perfect timing / macros)
 *  - subHuman: consistently faster than a human can physically click
 *  - identicalPos: 50 clicks at the exact same pixel (one signal, not decisive)
 */
export function detectAutoClickPattern(t: ClickTracker): { robotic: boolean; subHuman: boolean; identicalPos: boolean } {
  const n = t.times.length;
  if (n < 10) return { robotic: false, subHuman: false, identicalPos: false };

  const k = Math.min(16, n - 1);
  const intervals: number[] = [];
  for (let i = n - k; i < n; i++) intervals.push(t.times[i] - t.times[i - 1]);
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const std = Math.sqrt(variance);

  const robotic = intervals.length >= 10 && std < 3;          // unnaturally consistent
  const subHuman = mean > 0 && mean < 25 && std < 8;          // >40cps and steady

  let identicalPos = false;
  if (n >= 50) {
    const x0 = t.xs[n - 1], y0 = t.ys[n - 1];
    identicalPos = t.xs.slice(n - 50).every((x) => x === x0) && t.ys.slice(n - 50).every((y) => y === y0);
  }
  return { robotic, subHuman, identicalPos };
}

/**
 * Validate a click. Records timing, then decides reward.
 *   - untrusted (scripted) events are rejected outright.
 *   - 0–8 cps: full reward. 9–14: full reward, tracked. 15–25: capped.
 *   - >25 cps or robotic-at-speed: blocked.
 */
export function validateClick(event: ClickInput, t: ClickTracker, now = Date.now()): ClickValidation {
  // Scripted / synthetic events are never rewarded (acceptance: isTrusted === false).
  if (event && event.isTrusted === false) {
    return { allowed: false, rewardMultiplier: 0, cps: 0, severity: 'severe', reason: 'untrusted' };
  }

  recordClickTiming(t, now, Math.round(event?.clientX ?? 0), Math.round(event?.clientY ?? 0));

  if (now < t.blockUntil) {
    return { allowed: false, rewardMultiplier: 0, cps: getRecentClicksPerSecond(t, now), severity: 'severe', reason: 'blocked' };
  }

  const cps = getRecentClicksPerSecond(t, now);
  const pat = detectAutoClickPattern(t);
  const robotic = pat.robotic || pat.subHuman || (pat.identicalPos && pat.robotic);

  let severity: Severity = 'ok';
  let mult = 1;

  if (cps > EXTREME_CPS) { severity = 'severe'; mult = 0; }
  else if (cps >= HARD_CPS) { severity = 'severe'; mult = Math.min(1, SAFE_CPS / cps); }
  else if (cps > SOFT_CPS) { severity = 'suspicious'; }

  // Robotic timing escalates even at lower rates.
  if (robotic) {
    if (severity === 'ok') severity = 'suspicious';
    if (cps >= HARD_CPS) { severity = 'severe'; mult = 0; }
  }

  // Temporary reduced-reward penalty window.
  if (now < t.reducedUntil) mult *= 0.5;

  return { allowed: mult > 0, rewardMultiplier: mult, cps, severity, reason: robotic ? 'pattern' : undefined };
}

/** Compute the safe reward for a click given its validation result. */
export function applyClickRewardSafely(power: number, v: ClickValidation): { reward: number; counted: boolean } {
  const reward = power * v.rewardMultiplier;
  return { reward, counted: v.rewardMultiplier > 0 };
}

/** Set penalty timers based on severity + how many warnings already issued. */
export function escalatePenalty(t: ClickTracker, severity: Severity, priorWarnings: number, now = Date.now()): void {
  if (severity === 'severe') {
    if (priorWarnings >= 2) t.blockUntil = now + 15_000; // hard block ~15s
    else t.reducedUntil = now + 10_000;                   // reduce ~10s
  } else if (severity === 'suspicious' && priorWarnings >= 2) {
    t.reducedUntil = now + 10_000;
  }
}

/** Merge two persisted anti-cheat states (login merge): never clears a flag. */
export function mergeAntiCheat(cloud: AntiCheatState, guest: AntiCheatState): AntiCheatState {
  return {
    suspicious_clicks: Math.max(cloud.suspicious_clicks, guest.suspicious_clicks),
    blocked_clicks: Math.max(cloud.blocked_clicks, guest.blocked_clicks),
    max_cps_detected: Math.max(cloud.max_cps_detected, guest.max_cps_detected),
    warnings: Math.max(cloud.warnings, guest.warnings),
    last_warning_at:
      [cloud.last_warning_at, guest.last_warning_at].filter(Boolean).sort().pop() ?? null,
    flagged: cloud.flagged || guest.flagged, // sticky — never erased by merge
  };
}
