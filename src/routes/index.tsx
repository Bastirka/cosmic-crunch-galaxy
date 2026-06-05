import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGame, computeCps, computeClickPower, isUpgradeVisible } from "../game/useGame";
import { Starfield } from "../game/Starfield";
import { StarClicker } from "../game/StarClicker";
import { QuestsPanel } from "../game/QuestsPanel";
import { AscensionPanel } from "../game/AscensionPanel";
import { applyEquippedCosmetics } from "../game/cosmetics";
import { GoldenStar } from "../game/GoldenStar";
import { RandomEventOverlay, CosmicStormIndicator } from "../game/RandomEventsUI";
import { LoginModal } from "../game/LoginModal";
import { formatNumber, darkMatterFor, UPGRADES } from "../game/data";
import { getDailyStatus } from "../game/daily";
import { computeGalaxyCps, getActiveGalaxyObject, getGalaxyUnlockProgress, galaxyDef } from "../game/galaxy";
import { calculateBuffMultipliers } from "../game/buffs";
import { TopBar } from "../game/ui/TopBar";
import { BuffBar } from "../game/ui/BuffBar";
import { BottomNav, type NavItem } from "../game/ui/BottomNav";
import { LeftDock } from "../game/ui/LeftDock";
import { GameModal } from "../game/ui/GameModal";
import { ShopUpgradesModal } from "../game/ui/ShopUpgradesModal";
import { AwardsRanksModal } from "../game/ui/AwardsRanksModal";
import { GalaxyMapModal } from "../game/ui/GalaxyMapModal";
import { SettingsModal } from "../game/ui/SettingsModal";
import { StarSelector } from "../game/ui/StarShop";

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

/**
 * Five balanced dock slots. Single systems (Quests, Ascend) sit on the left;
 * the grouped/merged sections (Shop+Upgrades, Awards+Ranks, Settings) sit on
 * the right.
 */
type ModalKey = "quests" | "ascension" | "shop" | "awards" | "settings" | "galaxy";

const NAV_META: { key: ModalKey; icon: string; label: string }[] = [
  { key: "quests", icon: "🎯", label: "Quests" },
  { key: "ascension", icon: "🌌", label: "Ascend" },
  { key: "shop", icon: "🪐", label: "Shop" },
  { key: "awards", icon: "🏆", label: "Awards" },
  { key: "settings", icon: "⚙️", label: "Settings" },
];

function Index() {
  const {
    state, click, buyGenerator, buyUpgrade, claimGolden, ascend, reset,
    saveStatus, offlineEarned, dismissOffline, claimDaily, randomEvent,
    collectRandomEvent, claimQuestReward, equipCosmetic, soundSettings,
    updateSoundSettings, leaderboardPaused,
    switchGalaxyObject, unlockGalaxyObject, buyGalaxyGenerator, buyGalaxyUpgrade,
  } = useGame();
  const activeObject = getActiveGalaxyObject(state);
  const activeObjectDef = galaxyDef(activeObject.id);
  const nextUnlock = getGalaxyUnlockProgress(state);
  // Combined CPS includes every star's production (all of it waterfalls into
  // the single stardust pool) and the centralized buff multipliers; click power
  // stays Star 1's own × the buff click multiplier.
  const buffM = calculateBuffMultipliers(state);
  const cps = computeGalaxyCps(state, computeCps(state)) * buffM.cps;
  const power = computeClickPower(state) * buffM.click;
  const cosmetic = applyEquippedCosmetics(state);
  const multiStar = state.galaxy.objects.some((o) => o.unlocked && o.id !== "solar_core");

  // Single source of truth for which system panel is open.
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const close = () => setActiveModal(null);

  // "While you were away…" notification.
  const offlineShown = useRef(false);
  useEffect(() => {
    if (offlineEarned && offlineEarned.earnings > 0 && !offlineShown.current) {
      offlineShown.current = true;
      toast(`Welcome back! ✨`, {
        description: `While you were away, you earned ${formatNumber(offlineEarned.earnings)} stardust.`,
        duration: 6000,
      });
      dismissOffline();
    }
  }, [offlineEarned, dismissOffline]);

  const galaxyUnlockShown = useRef<string | null>(null);
  useEffect(() => {
    if (!nextUnlock || nextUnlock.object.unlocked || !nextUnlock.ready) return;
    if (galaxyUnlockShown.current === nextUnlock.object.id) return;
    galaxyUnlockShown.current = nextUnlock.object.id;
    toast(`${nextUnlock.object.name} is ready to unlock!`, {
      description: "Open Galaxy Map to claim the next layer.",
      duration: 5000,
    });
  }, [nextUnlock]);

  // ── Attention badges (a dot on the nav icon when something is ready) ──────
  const dailyReady = getDailyStatus(state.dailyRewards).canClaim;
  const badges: Partial<Record<ModalKey, boolean>> = {
    quests: state.quests.active_quests.some((q) => q.completed && !q.claimed),
    ascension: darkMatterFor(state.totalEarned) > 0,
    shop: UPGRADES.some((u) => isUpgradeVisible(state, u) && state.stardust >= u.cost),
    settings: dailyReady, // Daily now lives inside Settings
  };

  const navItems: NavItem[] = NAV_META.map((m) => ({
    key: m.key,
    icon: m.icon,
    label: m.label,
    badge: badges[m.key],
  }));

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Orbitron:wght@600;800;900&display=swap"
        rel="stylesheet"
      />
      {/* Equipped background theme (visual only, behind the starfield) */}
      {cosmetic.background?.visual.css && (
        <div className="pointer-events-none fixed inset-0 z-0" style={{ background: cosmetic.background.visual.css }} />
      )}
      <Starfield />
      <GoldenStar state={state} onClaim={claimGolden} />
      <RandomEventOverlay event={randomEvent} onCollect={collectRandomEvent} />
      <CosmicStormIndicator state={state} />

      {/* Top HUD */}
      <TopBar
        stardust={state.stardust}
        cps={cps}
        power={power}
        darkMatter={state.darkMatter ?? 0}
        saveStatus={saveStatus}
        badge={cosmetic.badge ? { icon: cosmetic.badge.visual.icon ?? "★", name: cosmetic.badge.name } : null}
      />
      <LoginModal />

      {/* Active buffs + synergies HUD (collapsible on mobile) */}
      <BuffBar state={state} />

      {/* Center stage — the clicker is the focus. Left padding (desktop) clears
          the vertical dock so the star stays centred and uncovered. */}
      <main className="safe-x relative z-10 flex min-h-[calc(100dvh-6rem)] flex-col items-center justify-center gap-6 px-4 pb-36 pt-4 lg:pb-10 lg:pl-24">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Stardust</div>
          <div
            className="my-1 text-5xl font-black tabular-nums text-[color:var(--star-core)] sm:text-6xl md:text-7xl"
            style={{ fontFamily: "'Orbitron', sans-serif", textShadow: "0 0 36px oklch(0.85 0.22 70 / 0.6)" }}
          >
            {formatNumber(state.stardust)}
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="text-[color:var(--nebula-cyan)]">{formatNumber(cps)}</span>/s ·{" "}
            <span className="text-foreground">{state.totalClicks.toLocaleString()}</span> clicks
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-foreground">
              Active: {activeObject.name}
            </span>
            {nextUnlock ? (
              <span className="rounded-full border border-[color:var(--nebula-cyan)]/20 bg-[oklch(0.2_0.08_200/0.25)] px-3 py-1 text-[color:var(--nebula-cyan)]">
                Next: {nextUnlock.object.name} at {formatNumber(nextUnlock.target)}
              </span>
            ) : (
              <span className="rounded-full border border-[color:var(--nebula-pink)]/20 bg-[oklch(0.25_0.08_330/0.2)] px-3 py-1 text-[color:var(--nebula-pink)]">
                Galaxy complete
              </span>
            )}
            <button
              onClick={() => setActiveModal("galaxy")}
              className="rounded-full border border-[color:var(--nebula-pink)]/30 bg-[oklch(0.35_0.14_330/0.3)] px-3 py-1 font-semibold text-[color:var(--nebula-pink)] transition hover:bg-[oklch(0.42_0.18_330/0.45)]"
            >
              Galaxy Map
            </button>
          </div>
          {nextUnlock && (
            <div className="mx-auto mt-3 w-full max-w-md">
              <div className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span>Next unlock</span>
                <span className="text-[color:var(--nebula-cyan)]">
                  {formatNumber(nextUnlock.current)} / {formatNumber(nextUnlock.target)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${nextUnlock.ratio * 100}%`, background: 'linear-gradient(90deg, var(--nebula-cyan), var(--nebula-pink))' }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {nextUnlock.object.name} unlocks at {nextUnlock.def.unlockText.toLowerCase()}.
              </p>
            </div>
          )}
        </div>

        {/* Active-star selector (only once a second star exists) */}
        {multiStar && <StarSelector state={state} onSwitch={switchGalaxyObject} />}

        <StarClicker
          onClick={click}
          power={power}
          planetGradient={cosmetic.planet?.visual.gradient ?? activeObjectDef?.visual.gradient}
          glowShadow={cosmetic.glow?.visual.shadow ?? activeObjectDef?.visual.glow}
          particleColor={cosmetic.particle?.visual.color}
          particleIcon={cosmetic.particle?.visual.icon ?? activeObjectDef?.visual.icon}
          centerIcon={activeObjectDef?.visual.icon}
        />
      </main>

      {/* Navigation — vertical left dock on desktop, bottom dock on mobile */}
      <div className="hidden lg:block">
        <LeftDock
          items={navItems}
          active={activeModal}
          onSelect={(key) => setActiveModal((cur) => (cur === key ? null : (key as ModalKey)))}
        />
      </div>
      <div className="lg:hidden">
        <BottomNav
          items={navItems}
          active={activeModal}
          onSelect={(key) => setActiveModal((cur) => (cur === key ? null : (key as ModalKey)))}
        />
      </div>

      {/* ── System panels (one open at a time) ─────────────────────────────── */}
      <GameModal open={activeModal === "quests"} onOpenChange={(o) => !o && close()} title="Quests" subtitle="Complete goals for rewards" accent="var(--star-core)">
        <QuestsPanel quests={state.quests} onClaim={claimQuestReward} />
      </GameModal>

      <GameModal open={activeModal === "ascension"} onOpenChange={(o) => !o && close()} title="Ascension" subtitle="Reset your run for permanent Dark Matter" accent="var(--nebula-pink)">
        <AscensionPanel state={state} onAscend={ascend} />
      </GameModal>

      {/* Merged: Shop (Generators) + Upgrades + multi-star expansion */}
      <ShopUpgradesModal
        open={activeModal === "shop"}
        onOpenChange={(o) => !o && close()}
        state={state}
        onBuyGenerator={buyGenerator}
        onBuyUpgrade={buyUpgrade}
        onSwitchStar={switchGalaxyObject}
        onBuyNewStar={unlockGalaxyObject}
        onBuyStarGenerator={buyGalaxyGenerator}
        onBuyStarUpgrade={buyGalaxyUpgrade}
      />

      {/* Merged: Awards (Achievements) + Ranks (Leaderboard) */}
      <AwardsRanksModal
        open={activeModal === "awards"}
        onOpenChange={(o) => !o && close()}
        state={state}
        leaderboardPaused={leaderboardPaused}
      />

      {/* Settings hub: Daily · Sound · Stats · Account · Looks */}
      <SettingsModal
        open={activeModal === "settings"}
        onOpenChange={(o) => !o && close()}
        state={state}
        onClaimDaily={claimDaily}
        soundSettings={soundSettings}
        onChangeSound={updateSoundSettings}
        onEquipCosmetic={equipCosmetic}
        saveStatus={saveStatus}
        onReset={reset}
        dailyBadge={dailyReady}
      />

      <GalaxyMapModal
        open={activeModal === "galaxy"}
        onOpenChange={(o) => !o && close()}
        state={state}
        onSwitchObject={switchGalaxyObject}
        onUnlockObject={unlockGalaxyObject}
      />
    </>
  );
}
