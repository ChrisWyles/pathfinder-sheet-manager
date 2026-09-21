"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addCharacterFeat,
  listFeatCatalog,
  removeCharacterFeat,
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

type FeatCatalogEntry = Awaited<ReturnType<typeof listFeatCatalog>>[number];
type CharacterFeat = CharacterWithRelations["feats"][number];

/** "Edit" on the Talents tab's Feats card — add/remove feats from the full
 * catalog (same search/filter UI as the creation wizard's Feats step,
 * reused as-is since it doesn't depend on wizard state) without any
 * slot/prerequisite bookkeeping, since this is a post-creation correction
 * tool rather than a guided pick. */
export function FeatsEditorDialog({
  characterId,
  feats,
}: {
  characterId: string;
  feats: CharacterFeat[];
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<FeatCatalogEntry[] | null>(null);
  const [sphereFilter, setSphereFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || catalog) return;
    let cancelled = false;
    listFeatCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => toast.error("Failed to load the feat catalog."));
    return () => {
      cancelled = true;
    };
  }, [open, catalog]);

  const byName = useMemo(() => {
    const m = new Map<string, FeatCatalogEntry>();
    for (const f of catalog ?? []) m.set(f.name.toLowerCase(), f);
    return m;
  }, [catalog]);

  const groups = useMemo(() => {
    const m = new Map<string, CharacterFeat[]>();
    for (const f of feats) {
      const key = f.name.trim().toLowerCase();
      const arr = m.get(key) ?? [];
      arr.push(f);
      m.set(key, arr);
    }
    return [...m.values()]
      .map((rows) => ({ name: rows[0].name, rows }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [feats]);

  const sphereFacets = useMemo(
    () =>
      [...new Set((catalog ?? []).flatMap((f) => f.sphereNames))]
        .sort()
        .map((s) => ({ value: s, label: s })),
    [catalog],
  );
  const categoryFacets = useMemo(
    () =>
      [...new Set((catalog ?? []).flatMap((f) => f.featTypes))]
        .sort()
        .map((t) => ({ value: t, label: t })),
    [catalog],
  );

  const filteredCatalog = useMemo(
    () =>
      (catalog ?? []).filter((f) => {
        if (
          sphereFilter.length > 0 &&
          !f.sphereNames.some((s) => sphereFilter.includes(s))
        )
          return false;
        if (
          categoryFilter.length > 0 &&
          !f.featTypes.some((t) => categoryFilter.includes(t))
        )
          return false;
        return true;
      }),
    [catalog, sphereFilter, categoryFilter],
  );
  const filtersActive = sphereFilter.length > 0 || categoryFilter.length > 0;

  const options = useMemo<PickerOption[]>(
    () =>
      filteredCatalog.map((f) => ({
        value: f.id,
        label: f.name,
        keywords: `${f.featTypes.join(" ")} ${f.sphereNames.join(" ")} ${f.prerequisites} ${f.benefit}`,
        badges: [...f.featTypes, ...f.sphereNames.map((s) => `${s} sphere`)],
        preview: (
          <>
            {f.prerequisites ? (
              <span className="block">Prereq: {f.prerequisites}</span>
            ) : null}
            {f.benefit || "No summary on file."}
          </>
        ),
        href: f.sourceUrl || undefined,
      })),
    [filteredCatalog],
  );

  function addById(featId: string) {
    const feat = catalog?.find((f) => f.id === featId);
    if (!feat) return;
    startTransition(async () => {
      const result = await addCharacterFeat({
        characterId,
        featId: feat.id,
        name: feat.name,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  function addByName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const feat = byName.get(trimmed.toLowerCase());
    startTransition(async () => {
      const result = await addCharacterFeat({
        characterId,
        featId: feat?.id,
        name: feat?.name ?? trimmed,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  function removeOne(characterFeatId: string) {
    startTransition(async () => {
      const result = await removeCharacterFeat({ characterId, characterFeatId });
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
          <DialogTitle>Edit feats</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {groups.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Known feats</div>
              <ul className="space-y-1.5">
                {groups.map((g) => {
                  const repeat = parseRepeatable(
                    byName.get(g.name.toLowerCase())?.benefit ?? "",
                    "feat",
                  );
                  return (
                    <li
                      key={g.name}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <span className="font-medium">
                        {g.name}
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
                            onClick={() => addByName(g.name)}
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
            <p className="text-muted-foreground text-sm">Loading feat catalog…</p>
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
                aria-label="feat"
                options={options}
                value={null}
                onChange={addById}
                emptyText="No feats match these filters."
              />

              <div className="flex gap-2">
                <Input
                  value={customName}
                  placeholder="Feat not in the list…"
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customName.trim()) {
                      e.preventDefault();
                      addByName(customName);
                      setCustomName("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!customName.trim()}
                  onClick={() => {
                    addByName(customName);
                    setCustomName("");
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
