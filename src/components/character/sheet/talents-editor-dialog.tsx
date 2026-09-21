"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addCharacterTalent,
  listTalentCatalog,
  removeCharacterTalent,
} from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseRepeatable } from "@/lib/rules/repeatable";

import { FacetDropdown } from "../create-wizard/facet-dropdown";
import { OptionPicker, type PickerOption } from "../create-wizard/option-picker";
import type { CharacterWithRelations } from "./types";

type TalentCatalogEntry = Awaited<ReturnType<typeof listTalentCatalog>>[number];
type CharacterTalent = CharacterWithRelations["talents"][number];

/** "Edit" on the Talents tab's Talents card — add/remove talents from the
 * full catalog (search/filter UI mirroring the creation wizard's Spheres &
 * Talents step) without gating on already-known spheres or any
 * budget/slot bookkeeping, since this is a post-creation correction tool
 * rather than a guided pick. */
export function TalentsEditorDialog({
  characterId,
  talents,
}: {
  characterId: string;
  talents: CharacterTalent[];
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<TalentCatalogEntry[] | null>(null);
  const [sphereFilter, setSphereFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const [customSphere, setCustomSphere] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || catalog) return;
    let cancelled = false;
    listTalentCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => toast.error("Failed to load the talent catalog."));
    return () => {
      cancelled = true;
    };
  }, [open, catalog]);

  const byName = useMemo(() => {
    const m = new Map<string, TalentCatalogEntry>();
    for (const t of catalog ?? []) m.set(t.name.toLowerCase(), t);
    return m;
  }, [catalog]);

  const groups = useMemo(() => {
    const m = new Map<string, CharacterTalent[]>();
    for (const t of talents) {
      const key = t.name.trim().toLowerCase();
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return [...m.values()]
      .map((rows) => ({ name: rows[0].name, sphereName: rows[0].sphereName, rows }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [talents]);

  const sphereFacets = useMemo(
    () =>
      [...new Set((catalog ?? []).map((t) => t.sphereName).filter(Boolean))]
        .sort()
        .map((s) => ({ value: s, label: s })),
    [catalog],
  );
  const categoryFacets = useMemo(
    () =>
      [...new Set((catalog ?? []).flatMap((t) => t.talentTypes))]
        .sort()
        .map((t) => ({ value: t, label: t })),
    [catalog],
  );

  const filteredCatalog = useMemo(
    () =>
      (catalog ?? []).filter((t) => {
        if (sphereFilter.length > 0 && !sphereFilter.includes(t.sphereName))
          return false;
        if (
          categoryFilter.length > 0 &&
          !t.talentTypes.some((c) => categoryFilter.includes(c))
        )
          return false;
        return true;
      }),
    [catalog, sphereFilter, categoryFilter],
  );
  const filtersActive = sphereFilter.length > 0 || categoryFilter.length > 0;

  const options = useMemo<PickerOption[]>(
    () =>
      filteredCatalog.map((t) => ({
        value: t.id,
        label: t.name,
        keywords: `${t.sphereName} ${t.talentTypes.join(" ")} ${t.description}`,
        badges: [t.sphereName, ...t.talentTypes],
        preview: t.description || "No description on file.",
        href: t.sourceUrl || undefined,
      })),
    [filteredCatalog],
  );

  function addById(talentId: string) {
    const talent = catalog?.find((t) => t.id === talentId);
    if (!talent) return;
    startTransition(async () => {
      const result = await addCharacterTalent({
        characterId,
        talentId: talent.id,
        name: talent.name,
        sphereName: talent.sphereName,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  function addByName(name: string, sphereName: string) {
    const trimmedName = name.trim();
    const trimmedSphere = sphereName.trim();
    if (!trimmedName || !trimmedSphere) return;
    const talent = byName.get(trimmedName.toLowerCase());
    startTransition(async () => {
      const result = await addCharacterTalent({
        characterId,
        talentId: talent?.id,
        name: talent?.name ?? trimmedName,
        sphereName: talent?.sphereName ?? trimmedSphere,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  function removeOne(characterTalentId: string) {
    startTransition(async () => {
      const result = await removeCharacterTalent({
        characterId,
        characterTalentId,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit talents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {groups.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Known talents</div>
              <ul className="space-y-1.5">
                {groups.map((g) => {
                  const repeat = parseRepeatable(
                    byName.get(g.name.toLowerCase())?.description ?? "",
                    "talent",
                  );
                  return (
                    <li
                      key={g.name}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{g.name}</span>
                        {g.sphereName && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            {g.sphereName}
                          </span>
                        )}
                        {g.rows.length > 1 && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            ×{g.rows.length}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {repeat.repeatable && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => addByName(g.name, g.sphereName)}
                          >
                            +
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => removeOne(g.rows[g.rows.length - 1].id)}
                        >
                          Remove
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {open && !catalog && (
            <p className="text-muted-foreground text-sm">Loading talent catalog…</p>
          )}

          {catalog && (
            <div className="space-y-3">
              {(sphereFacets.length > 0 || categoryFacets.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  {sphereFacets.length > 0 && (
                    <FacetDropdown
                      label="Sphere"
                      options={sphereFacets}
                      selected={sphereFilter}
                      onChange={setSphereFilter}
                    />
                  )}
                  {categoryFacets.length > 0 && (
                    <FacetDropdown
                      label="Category"
                      options={categoryFacets}
                      selected={categoryFilter}
                      onChange={setCategoryFilter}
                    />
                  )}
                  {filtersActive && (
                    <>
                      <span className="text-muted-foreground text-xs">
                        {filteredCatalog.length} of {catalog.length}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSphereFilter([]);
                          setCategoryFilter([]);
                        }}
                      >
                        Clear filters
                      </Button>
                    </>
                  )}
                </div>
              )}

              <OptionPicker
                aria-label="talent"
                options={options}
                value={null}
                onChange={addById}
                groupBy={(o) => byName.get(o.label.toLowerCase())?.sphereName ?? ""}
                emptyText="No talents match these filters."
              />

              <div className="flex flex-wrap gap-2">
                <Input
                  className="flex-1"
                  value={customName}
                  placeholder="Talent not in the list…"
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <Input
                  className="w-40"
                  value={customSphere}
                  placeholder="Sphere"
                  onChange={(e) => setCustomSphere(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!customName.trim() || !customSphere.trim()}
                  onClick={() => {
                    addByName(customName, customSphere);
                    setCustomName("");
                    setCustomSphere("");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
