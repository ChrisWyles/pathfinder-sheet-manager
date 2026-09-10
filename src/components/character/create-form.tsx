"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createCharacter } from "@/app/(app)/characters/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ABILITY_META,
  CLASS_PRESETS,
  RULES_SYSTEMS,
  SIZE_OPTIONS,
} from "@/lib/constants";
import { isValidDiscordWebhookUrl } from "@/lib/discord/webhook";
import { abilityModifier } from "@/lib/rules/abilities";
import { ABILITIES, type AbilityKey } from "@/lib/rules/types";

export interface ClassOption {
  id: string | null;
  name: string;
  system: "PATHFINDER_1E" | "SPHERES_OF_POWER";
  group: string;
  hitDie: number;
  babProgression: "FULL" | "THREE_QUARTER" | "HALF";
  fortProgression: "GOOD" | "POOR";
  refProgression: "GOOD" | "POOR";
  willProgression: "GOOD" | "POOR";
  skillRanksPerLevel: number;
}

const PRESET_OPTIONS: ClassOption[] = CLASS_PRESETS.map((p) => ({
  id: null,
  name: p.name,
  system: "PATHFINDER_1E",
  group: "Pathfinder 1e",
  hitDie: p.hitDie,
  babProgression: p.babProgression,
  fortProgression: p.fortProgression,
  refProgression: p.refProgression,
  willProgression: p.willProgression,
  skillRanksPerLevel: p.skillRanksPerLevel,
}));

const STANDARD_ARRAY: Record<AbilityKey, number> = {
  STR: 15,
  DEX: 14,
  CON: 13,
  INT: 12,
  WIS: 10,
  CHA: 8,
};

function fmtMod(score: number) {
  const m = abilityModifier(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

function humanBab(p: string) {
  return p === "THREE_QUARTER" ? "3/4" : p.toLowerCase();
}

export function CreateCharacterForm({ classes }: { classes: ClassOption[] }) {
  const [pending, startTransition] = useTransition();

  const options = classes.length > 0 ? classes : PRESET_OPTIONS;
  const groups = useMemo(() => {
    const map = new Map<string, ClassOption[]>();
    for (const o of options) {
      const list = map.get(o.group) ?? [];
      list.push(o);
      map.set(o.group, list);
    }
    return [...map.entries()];
  }, [options]);

  const [system, setSystem] =
    useState<(typeof RULES_SYSTEMS)[number]["value"]>("PATHFINDER_1E");
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [alignment, setAlignment] = useState("");
  const [size, setSize] = useState("MEDIUM");
  const [baseSpeed, setBaseSpeed] = useState(30);
  const [classKey, setClassKey] = useState(
    () => (options.find((o) => o.name === "Fighter") ?? options[0]).name,
  );
  const [className, setClassName] = useState(classKey);
  const [classLevel, setClassLevel] = useState(1);
  const [abilities, setAbilities] = useState<Record<AbilityKey, number>>({
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    WIS: 10,
    CHA: 10,
  });
  const [webhook, setWebhook] = useState("");

  const selected = useMemo(
    () => options.find((o) => o.name === classKey) ?? options[0],
    [options, classKey],
  );

  const webhookState =
    webhook.length === 0
      ? "empty"
      : isValidDiscordWebhookUrl(webhook)
        ? "valid"
        : "invalid";

  function submit() {
    if (!name.trim()) {
      toast.error("Give your character a name.");
      return;
    }
    if (webhookState === "invalid") {
      toast.error("The Discord webhook URL doesn't look right.");
      return;
    }
    startTransition(async () => {
      const result = await createCharacter({
        name: name.trim(),
        system,
        race: race.trim(),
        alignment: alignment.trim(),
        size: size as CreateArg["size"],
        baseSpeed,
        abilities,
        className: className.trim() || selected.name,
        classLevel,
        gameClassId: selected.id ?? undefined,
        hitDie: selected.hitDie,
        skillRanksPerLevel: selected.skillRanksPerLevel,
        babProgression: selected.babProgression,
        fortProgression: selected.fortProgression,
        refProgression: selected.refProgression,
        willProgression: selected.willProgression,
        discordWebhookUrl: webhook.trim(),
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rules system</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={system}
            onValueChange={(v) =>
              setSystem(v as (typeof RULES_SYSTEMS)[number]["value"])
            }
            className="gap-3"
          >
            {RULES_SYSTEMS.map((s) => (
              <div key={s.value} className="flex items-start gap-3">
                <RadioGroupItem
                  value={s.value}
                  id={`sys-${s.value}`}
                  className="mt-1"
                />
                <Label
                  htmlFor={`sys-${s.value}`}
                  className="flex flex-col gap-0.5"
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground text-sm font-normal">
                    {s.blurb}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Ancestry / race">
            <Input value={race} onChange={(e) => setRace(e.target.value)} />
          </Field>
          <Field label="Alignment">
            <Input
              value={alignment}
              onChange={(e) => setAlignment(e.target.value)}
              placeholder="e.g. NG"
            />
          </Field>
          <Field label="Size">
            <Select value={size} onValueChange={(v) => v && setSize(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Base speed (ft.)">
            <Input
              type="number"
              value={baseSpeed}
              min={0}
              max={240}
              step={5}
              onChange={(e) => setBaseSpeed(Number(e.target.value) || 0)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Class">
            <Select
              value={classKey}
              onValueChange={(v) => {
                if (!v) return;
                setClassKey(v);
                setClassName(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {groups.map(([label, list]) => (
                  <SelectGroup key={label}>
                    <SelectLabel>{label}</SelectLabel>
                    {list.map((o) => (
                      <SelectItem key={o.name} value={o.name}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Class name on the sheet">
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </Field>
          <Field label="Level">
            <Input
              type="number"
              value={classLevel}
              min={1}
              max={20}
              onChange={(e) =>
                setClassLevel(
                  Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                )
              }
            />
          </Field>
          <div className="text-muted-foreground self-end text-sm">
            d{selected.hitDie} HD · BAB {humanBab(selected.babProgression)} ·{" "}
            {selected.skillRanksPerLevel} skill ranks/level
            {selected.id ? "" : " · from preset"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ability scores</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAbilities({ ...STANDARD_ARRAY })}
            >
              Fill standard array
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {ABILITIES.map((key) => (
            <Field key={key} label={ABILITY_META[key].label}>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={abilities[key]}
                  min={1}
                  max={60}
                  onChange={(e) =>
                    setAbilities((prev) => ({
                      ...prev,
                      [key]: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                />
                <span className="text-muted-foreground w-10 text-sm tabular-nums">
                  {fmtMod(abilities[key])}
                </span>
              </div>
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discord delivery (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Field label="Channel webhook URL">
            <Input
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </Field>
          <p className="text-muted-foreground text-sm">
            {webhookState === "invalid"
              ? "That isn't a Discord webhook URL."
              : "Discord → Channel → Edit → Integrations → Webhooks → New Webhook → Copy URL. You can add this later."}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} size="lg">
          {pending ? "Creating…" : "Create character"}
        </Button>
      </div>
    </div>
  );
}

type CreateArg = Parameters<typeof createCharacter>[0];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
