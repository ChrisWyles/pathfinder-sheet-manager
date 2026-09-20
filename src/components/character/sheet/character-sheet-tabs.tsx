"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AbilityKey, DerivedStats } from "@/lib/rules/types";
import type { FavoredClassBonusMechanic } from "@/lib/rules/favored-class-bonus";

import {
  AbilitiesTab,
  type CustomCastingTradition,
  type CustomMartialTradition,
} from "./abilities-tab";
import { CombatTab } from "./combat-tab";
import { EquipmentTab } from "./equipment-tab";
import { StatsTab } from "./stats-tab";
import { TalentsTab } from "./talents-tab";
import type { CharacterWithRelations } from "./types";

const TABS = [
  { value: "stats", label: "Stats" },
  { value: "combat", label: "Combat" },
  { value: "equipment", label: "Equipment" },
  { value: "abilities", label: "Abilities" },
  { value: "talents", label: "Talents" },
] as const;

export function CharacterSheetTabs({
  character,
  derived,
  baseScores,
  customCasting,
  customMartial,
  favoredBonusNote,
  favoredClassName,
  fcbMechanic,
  fcbTalentsEarned,
  fcbNextLevel,
}: {
  character: CharacterWithRelations;
  derived: DerivedStats;
  baseScores: Record<AbilityKey, number>;
  customCasting: CustomCastingTradition | null;
  customMartial: CustomMartialTradition | null;
  favoredBonusNote: string;
  favoredClassName?: string;
  fcbMechanic: FavoredClassBonusMechanic | null;
  fcbTalentsEarned: number;
  fcbNextLevel: number | null;
}) {
  return (
    <Tabs defaultValue="stats">
      <TabsList variant="line" className="mb-6">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="stats">
        <StatsTab character={character} derived={derived} baseScores={baseScores} />
      </TabsContent>
      <TabsContent value="combat">
        <CombatTab character={character} derived={derived} />
      </TabsContent>
      <TabsContent value="equipment">
        <EquipmentTab character={character} />
      </TabsContent>
      <TabsContent value="abilities">
        <AbilitiesTab
          customCasting={customCasting}
          customMartial={customMartial}
          favoredBonusNote={favoredBonusNote}
          favoredClassName={favoredClassName}
          fcbMechanic={fcbMechanic}
          fcbTalentsEarned={fcbTalentsEarned}
          fcbNextLevel={fcbNextLevel}
        />
      </TabsContent>
      <TabsContent value="talents">
        <TalentsTab character={character} />
      </TabsContent>
    </Tabs>
  );
}
