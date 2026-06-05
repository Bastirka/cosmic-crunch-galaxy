import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GameModal } from './GameModal';
import { AchievementsPanel } from '../AchievementsPanel';
import { LeaderboardPanel } from '../LeaderboardModal';
import type { GameState } from '../useGame';

/**
 * Merged Awards section: Achievements ("Awards") and the Leaderboard ("Ranks")
 * behind segmented tabs in one modal. Reuses the existing panels unchanged.
 */
export function AwardsRanksModal({
  open,
  onOpenChange,
  state,
  leaderboardPaused,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: GameState;
  leaderboardPaused: boolean;
}) {
  return (
    <GameModal open={open} onOpenChange={onOpenChange} title="Awards" subtitle="Achievements & leaderboard" accent="var(--star-glow)">
      <Tabs defaultValue="awards" className="flex flex-col">
        <TabsList className="w-full bg-black/30">
          <TabsTrigger value="awards" className="flex-1">Awards</TabsTrigger>
          <TabsTrigger value="ranks" className="flex-1">Ranks</TabsTrigger>
        </TabsList>
        <TabsContent value="awards" className="mt-3">
          <AchievementsPanel state={state} />
        </TabsContent>
        <TabsContent value="ranks" className="mt-3">
          <LeaderboardPanel paused={leaderboardPaused} />
        </TabsContent>
      </Tabs>
    </GameModal>
  );
}
