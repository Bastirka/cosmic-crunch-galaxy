import { useAuth } from '../../lib/auth';
import type { SaveStatus } from '../useGame';

const STATUS_META: Record<SaveStatus, { label: string; color: string }> = {
  idle: { label: 'Idle', color: 'var(--muted-foreground)' },
  saving: { label: 'Saving…', color: 'var(--nebula-cyan)' },
  saved: { label: 'Saved to cloud', color: 'var(--nebula-cyan)' },
  local: { label: 'Saved on this device', color: 'var(--star-core)' },
  error: { label: 'Save error', color: 'var(--nebula-pink)' },
};

/**
 * Account modal body: identity, cloud-save status, login/logout and the
 * destructive hard-reset. Reuses the shared auth context — no new state.
 */
export function AccountPanel({ saveStatus, onReset }: { saveStatus: SaveStatus; onReset: () => void }) {
  const { mode, displayName, email, openLogin, logout, configured } = useAuth();
  const name = email ?? displayName ?? 'Player';
  const status = STATUS_META[saveStatus];

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-black/30 text-2xl">
          {mode === 'cloud' ? '🧑‍🚀' : '👽'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {mode === 'cloud' ? name : 'Guest player'}
          </p>
          <p className="flex items-center gap-1.5 text-[11px]" style={{ color: status.color }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
            {status.label}
          </p>
        </div>
      </div>

      {mode === 'cloud' ? (
        <button
          onClick={() => void logout()}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold uppercase tracking-[0.15em] text-foreground transition hover:bg-white/10"
        >
          Log out
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={openLogin}
            disabled={!configured}
            className="w-full rounded-xl border border-[color:var(--nebula-cyan)]/40 bg-[oklch(0.3_0.1_200/0.4)] py-2.5 text-sm font-bold uppercase tracking-[0.15em] text-foreground transition hover:bg-[oklch(0.4_0.14_200/0.5)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Log in / Sign up
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            {configured
              ? 'Log in to sync your progress to the cloud and join the leaderboard.'
              : 'Cloud login is not configured. Progress is saved on this device.'}
          </p>
        </div>
      )}

      <div className="mt-1 border-t border-white/10 pt-3">
        <button
          onClick={onReset}
          className="w-full rounded-xl border border-destructive/30 bg-destructive/10 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-destructive transition hover:bg-destructive/20"
        >
          Hard reset
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Erases everything — Dark Matter, achievements and cosmetics included.
        </p>
      </div>
    </div>
  );
}
