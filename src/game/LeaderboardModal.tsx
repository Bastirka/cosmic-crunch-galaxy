import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../lib/auth';
import {
  getLeaderboard, formatLeaderboardValue, LEADERBOARD_CATEGORIES,
  type LeaderboardCategory, type LeaderboardRow,
} from './leaderboard';

/** Leaderboard list + category tabs, standalone for the Awards+Ranks modal. */
export function LeaderboardPanel({ paused = false }: { paused?: boolean }) {
  const { user, mode, openLogin, configured } = useAuth();
  const [category, setCategory] = useState<LeaderboardCategory>('total_earned');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (cat: LeaderboardCategory) => {
    setLoading(true);
    setError(false);
    try {
      setRows(await getLeaderboard(cat));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount (the panel only mounts when its section is visible) and on
  // category change.
  useEffect(() => {
    void load(category);
  }, [category, load]);

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={category} onValueChange={(v) => setCategory(v as LeaderboardCategory)}>
        <TabsList className="flex w-full flex-wrap gap-1 bg-black/30">
          {LEADERBOARD_CATEGORIES.map((c) => (
            <TabsTrigger key={c.key} value={c.key} className="flex-1 text-[10px] px-1.5">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {mode === 'guest' && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-[11px] text-muted-foreground">
          Playing as guest.{' '}
          {configured ? (
            <button onClick={openLogin} className="font-semibold text-[color:var(--nebula-cyan)] underline">
              Login to join the leaderboard.
            </button>
          ) : (
            'Login to join the leaderboard.'
          )}
        </p>
      )}

      {paused && (
        <p className="rounded-lg border border-[color:var(--nebula-pink)]/40 bg-[oklch(0.35_0.14_330/0.25)] px-3 py-2 text-center text-[11px] text-[color:var(--nebula-pink)]">
          ⚠️ Leaderboard updates paused due to suspicious clicking.
        </p>
      )}

      <div className="max-h-[50vh] overflow-y-auto pr-1">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[color:var(--nebula-pink)]">Could not load leaderboard. Try again later.</p>
            <button
              onClick={() => void load(category)}
              className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No leaderboard entries yet.</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {rows.map((row, i) => {
              const isMe = user?.id === row.user_id;
              return (
                <li
                  key={row.user_id}
                  className={[
                    'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
                    isMe
                      ? 'border-[color:var(--nebula-cyan)] bg-[oklch(0.3_0.1_200/0.35)]'
                      : 'border-white/5 bg-black/20',
                  ].join(' ')}
                >
                  <span className="w-6 shrink-0 text-center font-bold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[10px]">
                    {(row.display_name ?? 'C').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate">
                    {row.display_name ?? 'Cosmic Player'}
                    {isMe && <span className="ml-1 text-[10px] text-[color:var(--nebula-cyan)]">(you)</span>}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-[color:var(--star-core)]">
                    {formatLeaderboardValue(row[category] as number)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export function LeaderboardButton({
  paused = false,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  paused?: boolean;
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
          title="Leaderboard"
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm transition hover:bg-white/10"
        >
          🏆
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel max-w-md border-white/10 bg-black/60 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle
              className="text-center text-lg font-black uppercase tracking-[0.15em] text-[color:var(--nebula-cyan)]"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Leaderboard
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Top cosmic harvesters
            </DialogDescription>
          </DialogHeader>

          {open && <LeaderboardPanel paused={paused} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
