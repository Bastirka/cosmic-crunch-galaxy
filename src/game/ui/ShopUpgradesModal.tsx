import type { ComponentProps } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GameModal } from './GameModal';
import { GeneratorsPanel } from '../GeneratorsPanel';
import { UpgradesPanel } from '../UpgradesPanel';
import { StarSelector, StarGeneratorsPanel, StarUpgradesPanel, BuyNewStarCard } from './StarShop';
import type { GameState } from '../useGame';
import { getActiveGalaxyObject } from '../galaxy';

/**
 * Merged Shop section: Generators and Upgrades behind segmented tabs in one
 * modal — now multi-star aware. A star selector switches which star you manage;
 * Star 1 reuses the original panels, stars 2+ use the per-star panels (paid from
 * each star's own earnings). A "Buy New Star" card appears near the milestone.
 */
export function ShopUpgradesModal({
  open,
  onOpenChange,
  state,
  onBuyGenerator,
  onBuyUpgrade,
  onSwitchStar,
  onBuyNewStar,
  onBuyStarGenerator,
  onBuyStarUpgrade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: GameState;
  onBuyGenerator: ComponentProps<typeof GeneratorsPanel>['onBuy'];
  onBuyUpgrade: ComponentProps<typeof UpgradesPanel>['onBuy'];
  onSwitchStar: (starId: string) => void;
  onBuyNewStar: () => void;
  onBuyStarGenerator: ComponentProps<typeof StarGeneratorsPanel>['onBuy'];
  onBuyStarUpgrade: ComponentProps<typeof StarUpgradesPanel>['onBuy'];
}) {
  const active = getActiveGalaxyObject(state);
  const multiStar = state.galaxy.objects.some((o) => o.unlocked && o.id !== 'solar_core');

  return (
    <GameModal open={open} onOpenChange={onOpenChange} title="Shop" subtitle="Generators & upgrades" accent="var(--nebula-cyan)">
      {multiStar && <StarSelector state={state} onSwitch={onSwitchStar} className="pb-3" />}

      <Tabs defaultValue="generators" className="flex flex-col">
        <TabsList className="w-full bg-black/30">
          <TabsTrigger value="generators" className="flex-1">Generators</TabsTrigger>
          <TabsTrigger value="upgrades" className="flex-1">Upgrades</TabsTrigger>
        </TabsList>
        <TabsContent value="generators" className="mt-3">
          {active.id === 'solar_core' ? (
            <GeneratorsPanel state={state} onBuy={onBuyGenerator} />
          ) : (
            <StarGeneratorsPanel state={state} star={active} onBuy={onBuyStarGenerator} />
          )}
        </TabsContent>
        <TabsContent value="upgrades" className="mt-3">
          {active.id === 'solar_core' ? (
            <UpgradesPanel state={state} onBuy={onBuyUpgrade} />
          ) : (
            <StarUpgradesPanel star={active} onBuy={onBuyStarUpgrade} />
          )}
        </TabsContent>
      </Tabs>

      <BuyNewStarCard state={state} onBuyNew={onBuyNewStar} />
    </GameModal>
  );
}
