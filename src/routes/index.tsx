import { createFileRoute } from "@tanstack/react-router";
import { useGame, computeCps, computeClickPower } from "../game/useGame";
import { Starfield } from "../game/Starfield";
import { StarClicker } from "../game/StarClicker";
import { GeneratorsPanel } from "../game/GeneratorsPanel";
import { UpgradesPanel } from "../game/UpgradesPanel";
import { formatNumber } from "../game/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Crunch — Idle Stardust Clicker" },
      { name: "description", content: "Harvest stardust from a glowing star, automate the cosmos, and build an interstellar empire in this addictive sci-fi idle clicker." },
      { property: "og:title", content: "Cosmic Crunch" },
      { property: "og:description", content: "Click the star. Crunch the cosmos. Idle your way to a galactic empire." },
    ],
  }),
  component: Index,
});

function Index() {
  const { state, click, buyGenerator, buyUpgrade, reset } = useGame();
  const cps = computeCps(state);
  const power = computeClickPower(state);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Orbitron:wght@600;800;900&display=swap"
        rel="stylesheet"
      />
      <Starfield />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:py-10">
        {/* Center: clicker */}
        <section className="flex flex-1 flex-col items-center justify-start gap-8 lg:order-2">
          <header className="w-full text-center">
            <h1
              className="bg-gradient-to-r from-[color:var(--nebula-cyan)] via-[color:var(--star-core)] to-[color:var(--nebula-pink)] bg-clip-text text-4xl font-black uppercase tracking-[0.15em] text-transparent md:text-6xl"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Cosmic Crunch
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Harvest the heart of a dying star.
            </p>
          </header>

          {/* HUD */}
          <div className="glass-panel w-full max-w-md rounded-2xl px-6 py-4 text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Stardust</div>
            <div
              className="my-1 text-5xl font-black tabular-nums text-[color:var(--star-core)]"
              style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 30px oklch(0.85 0.22 70 / 0.6)' }}
            >
              {formatNumber(state.stardust)}
            </div>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span>per second: <b className="text-[color:var(--nebula-cyan)]">{formatNumber(cps)}</b></span>
              <span>clicks: <b className="text-foreground">{state.totalClicks}</b></span>
            </div>
          </div>

          <StarClicker onClick={click} power={power} />

          <button
            onClick={reset}
            className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 transition-colors hover:text-destructive"
          >
            Reset universe
          </button>
        </section>

        {/* Left: upgrades */}
        <aside className="glass-panel order-3 flex-1 rounded-2xl p-4 lg:order-1 lg:max-w-sm lg:self-start">
          <UpgradesPanel state={state} onBuy={buyUpgrade} />
        </aside>

        {/* Right: generators */}
        <aside className="glass-panel order-2 flex-1 rounded-2xl p-4 lg:order-3 lg:max-w-sm lg:self-start">
          <GeneratorsPanel state={state} onBuy={buyGenerator} />
        </aside>
      </main>
    </>
  );
}
