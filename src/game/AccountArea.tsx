import { useAuth } from '../lib/auth';
import type { SaveStatus } from './useGame';

const STATUS_META: Record<SaveStatus, { label: string; color: string }> = {
  idle: { label: '', color: 'var(--muted-foreground)' },
  saving: { label: 'Saving…', color: 'var(--nebula-cyan)' },
  saved: { label: 'Saved', color: 'var(--nebula-cyan)' },
  local: { label: 'Local save', color: 'var(--star-core)' },
  error: { label: 'Save error', color: 'var(--nebula-pink)' },
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  const meta = STATUS_META[status];
  if (!meta.label) return null;
  return (
    <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.25em]" style={{ color: meta.color }}>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: meta.color, opacity: status === 'saving' ? 0.5 : 1 }}
      />
      {meta.label}
    </span>
  );
}

export function AccountArea({ saveStatus }: { saveStatus: SaveStatus }) {
  const { mode, displayName, email, openLogin, logout } = useAuth();
  const name = email ?? displayName ?? 'Player';

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end leading-tight">
        {mode === 'cloud' ? (
          <span className="max-w-[140px] truncate text-xs font-semibold text-foreground">{name}</span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">Guest</span>
        )}
        <SaveIndicator status={saveStatus} />
      </div>

      {mode === 'cloud' ? (
        <button
          onClick={() => void logout()}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
        >
          Logout
        </button>
      ) : (
        <button
          onClick={openLogin}
          className="rounded-lg border border-[color:var(--nebula-cyan)]/40 bg-[oklch(0.3_0.1_200/0.35)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground transition hover:bg-[oklch(0.4_0.14_200/0.45)]"
        >
          Login
        </button>
      )}
    </div>
  );
}
