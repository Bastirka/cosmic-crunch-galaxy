import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '../lib/auth';

export function LoginModal() {
  const { loginOpen, closeLogin, loginWithEmail, registerWithEmail, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (action: 'login' | 'register') => {
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError('Enter an email and password.');
      return;
    }
    if (action === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const res =
        action === 'login'
          ? await loginWithEmail(email.trim(), password)
          : await registerWithEmail(email.trim(), password);
      if (res.error) setError(res.error);
      else if (res.needsConfirmation) setInfo('Account created! Check your email to confirm, then log in.');
      // On success with a session, onAuthStateChange closes the modal automatically.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={loginOpen} onOpenChange={(o) => (o ? null : closeLogin())}>
      <DialogContent className="glass-panel max-w-sm border-white/10 bg-black/60 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle
            className="bg-gradient-to-r from-[color:var(--nebula-cyan)] via-[color:var(--star-core)] to-[color:var(--nebula-pink)] bg-clip-text text-center text-lg font-black uppercase tracking-[0.15em] text-transparent"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Cosmic Crunch
          </DialogTitle>
          <DialogDescription className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Save your galaxy to the cloud
          </DialogDescription>
        </DialogHeader>

        <button
          onClick={closeLogin}
          className="h-11 w-full rounded-lg border border-white/10 bg-white/5 text-sm font-semibold text-foreground transition hover:bg-white/10"
        >
          Continue as Guest
        </button>

        {configured ? (
          <>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run('login');
              }}
              className="flex flex-col gap-2.5"
            >
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-black/40"
              />
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-black/40"
              />

              {error && <p className="text-center text-xs text-destructive">{error}</p>}
              {info && <p className="text-center text-xs text-[color:var(--nebula-cyan)]">{info}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 flex-1 rounded-lg border border-[color:var(--nebula-cyan)]/40 bg-[oklch(0.3_0.1_200/0.45)] text-sm font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-[oklch(0.4_0.14_200/0.55)] disabled:opacity-50"
                >
                  {busy ? '…' : 'Login'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run('register')}
                  className="h-11 flex-1 rounded-lg border border-white/10 bg-white/5 text-sm font-bold uppercase tracking-[0.12em] text-foreground transition hover:bg-white/10 disabled:opacity-50"
                >
                  {busy ? '…' : 'Register'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-[11px] text-muted-foreground">
            Login is unavailable — Supabase is not configured. You can still play as a guest.
          </p>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Your progress will be saved automatically.
        </p>
      </DialogContent>
    </Dialog>
  );
}
