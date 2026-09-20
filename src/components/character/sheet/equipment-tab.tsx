import type { ItemType } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { effectiveItemType } from "@/lib/rules/inventory-item";

import { CustomItemDialog } from "./custom-item-dialog";
import { InventoryRow } from "./inventory-row";
import { ItemPicker } from "./item-picker";
import type { CharacterWithRelations } from "./types";

type InventoryItem = CharacterWithRelations["inventory"][number];

const WEAPON_TYPES: ItemType[] = ["WEAPON", "AMMUNITION"];
const ARMOR_TYPES: ItemType[] = ["ARMOR", "SHIELD"];

const EQUIPMENT_TYPES: ItemType[] = [
  "GEAR",
  "CONSUMABLE",
  "TOOL",
  "WONDROUS",
  "RING",
  "ROD",
  "STAFF",
  "WAND",
  "POTION",
  "SCROLL",
  "TREASURE",
  "OTHER",
];

const SUB_TABS = [
  {
    value: "weapons",
    label: "Weapons",
    addLabel: "Add weapon",
    customKind: "weapon",
    customLabel: "Add custom weapon",
    types: WEAPON_TYPES,
    showMasterwork: true,
    matches: (i: InventoryItem) => {
      const type = effectiveItemType(i);
      return type != null && WEAPON_TYPES.includes(type);
    },
  },
  {
    value: "armor",
    label: "Armor",
    addLabel: "Add armor",
    customKind: "armor",
    customLabel: "Add custom armor",
    types: ARMOR_TYPES,
    showMasterwork: true,
    matches: (i: InventoryItem) => {
      const type = effectiveItemType(i);
      return type != null && ARMOR_TYPES.includes(type);
    },
  },
  {
    value: "equipment",
    label: "Equipment",
    addLabel: "Add gear",
    customKind: "equipment",
    customLabel: "Add custom gear",
    types: EQUIPMENT_TYPES,
    showMasterwork: false,
    // Everything else, including freeform items with no catalog entry.
    matches: (i: InventoryItem) => {
      const type = effectiveItemType(i);
      return type == null || (!WEAPON_TYPES.includes(type) && !ARMOR_TYPES.includes(type));
    },
  },
] as const;

export function EquipmentTab({ character }: { character: CharacterWithRelations }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weapons">
          <TabsList>
            {SUB_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SUB_TABS.map((t) => {
            const items = character.inventory.filter(t.matches);
            const totalWeight = items.reduce(
              (sum, i) => sum + i.weight * i.quantity,
              0,
            );
            return (
              <TabsContent key={t.value} value={t.value} className="space-y-2 pt-3">
                <div className="flex flex-wrap gap-2">
                  <ItemPicker
                    characterId={character.id}
                    types={t.types}
                    kind={t.value}
                    triggerLabel={t.addLabel}
                    dialogTitle={`Add ${t.label}`}
                  />
                  <CustomItemDialog
                    characterId={character.id}
                    kind={t.customKind}
                    triggerLabel={t.customLabel}
                    dialogTitle={t.customLabel}
                  />
                </div>

                {items.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nothing here yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map((i) => (
                      <InventoryRow
                        key={i.id}
                        characterId={character.id}
                        item={i}
                        showMasterwork={t.showMasterwork}
                      />
                    ))}
                  </div>
                )}

                {totalWeight > 0 && (
                  <p className="text-muted-foreground text-right text-xs">
                    Total: {totalWeight.toFixed(1)} lb.
                  </p>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
