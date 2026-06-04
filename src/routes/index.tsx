import { createFileRoute } from "@tanstack/react-router";
import { useGame, computeCps, computeClickPower } from "../game/useGame";
import { Starfield } from "../game/Starfield";
import { StarClicker } from "../game/StarClicker";
import { GeneratorsPanel } from "../game/GeneratorsPanel";
import { UpgradesPanel } from "../game/UpgradesPanel";
import { AchievementsPanel } from "../game/AchievementsPanel";
import { StatsPanel } from "../game/StatsPanel";
import { GoldenStar } from "../game/GoldenStar";
import { formatNumber } from "../game/data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Crunch — Idle Stardust Clicker" },
      { name: "description", content: "Harvest stardust, automate the cosmos, catch golden stars, and ascend with Dark Matter in this addictive sci-fi idle clicker." },
      { property: "og:title", content: "Cosmic Crunch" },
      { property: "og:description", content: "Click the star. Crunch the cosmos. Idle your way to a galactic empire." },
    ],
  }),
  component: Index,
});

function Index() {
  const { state, click, buyGenerator, buyUpgrade, claimGolden, ascend, reset } = useGame();
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
      <GoldenStar state={state} onClaim={claimGolden} />

      {/* Top bar */}
      <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1
              className="bg-gradient-to-r from-[color:var(--nebula-cyan)] via-[color:var(--star-core)] to-[color:var(--nebula-pink)] bg-clip-text text-xl font-black uppercase tracking-[0.15em] text-transparent sm:text-2xl"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Cosmic Crunch
            </h1>
            <span className="hidden text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:inline">
              Harvest the cosmos
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Stat label="CPS" value={formatNumber(cps)} color="var(--nebula-cyan)" />
            <Stat label="Click" value={formatNumber(power)} color="var(--star-core)" />
            {(state.darkMatter ?? 0) > 0 && (
              <Stat label="DM" value={`${state.darkMatter}`} color="var(--nebula-pink)" />
            )}
            <button
              onClick={reset}
              className="ml-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 transition-colors hover:text-destructive"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* Left column */}
        <aside className="flex flex-col gap-4 lg:order-1">
          <section className="glass-panel rounded-2xl p-4">
            <StatsPanel state={state} onAscend={ascend} />
          </section>
          <section className="glass-panel rounded-2xl p-4">
            <AchievementsPanel state={state} />
          </section>
        </aside>

        {/* Center column — clicker */}
        <section className="flex flex-col items-center justify-start gap-6 lg:order-2">
          <div className="glass-panel w-full max-w-md rounded-2xl px-6 py-5 text-center">
            <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Stardust</div>
            <div
              className="my-1 text-5xl font-black tabular-nums text-[color:var(--star-core)] md:text-6xl"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                textShadow: '0 0 30px oklch(0.85 0.22 70 / 0.6)',
              }}
            >
              {formatNumber(state.stardust)}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="text-[color:var(--nebula-cyan)]">{formatNumber(cps)}</span>/s ·{' '}
              <span className="text-foreground">{state.totalClicks.toLocaleString()}</span> clicks
            </div>
          </div>

          <StarClicker onClick={click} power={power} />
        </section>

        {/* Right column — tabbed shop */}
        <aside className="glass-panel flex flex-col rounded-2xl p-4 lg:order-3 lg:max-h-[calc(100vh-7rem)] lg:sticky lg:top-4">
          <Tabs defaultValue="generators" className="flex h-full flex-col">
            <TabsList className="w-full bg-black/30">
              <TabsTrigger value="generators" className="flex-1">Generators</TabsTrigger>
              <TabsTrigger value="upgrades" className="flex-1">
                Upgrades
              </TabsTrigger>
            </TabsList>
            <TabsContent value="generators" className="mt-3 flex-1 overflow-y-auto pr-1">
              <GeneratorsPanel state={state} onBuy={buyGenerator} />
            </TabsContent>
            <TabsContent value="upgrades" className="mt-3 flex-1 overflow-y-auto pr-1">
              <UpgradesPanel state={state} onBuy={buyUpgrade} />
            </TabsContent>
          </Tabs>
        </aside>
      </main>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
