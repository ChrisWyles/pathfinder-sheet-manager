"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useTransition,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { createCharacter } from "@/app/(app)/characters/actions";
import { CLASS_PRESETS } from "@/lib/constants";
import { abilityModifier } from "@/lib/rules/abilities";
import {
  buildStepPlan,
  type SphereClassData,
} from "@/lib/rules/class-creation-steps";
import {
  type AbilityMethod,
  type CreationChoiceStep,
  pointBuyTotal,
  skillRanksBudget,
  type StepTab,
  stepsByTab,
} from "@/lib/rules/creation";
import { isHumanRace } from "@/lib/rules/races";
import {
  ABILITIES,
  type AbilityKey,
  type CastingAbilityKey,
} from "@/lib/rules/types";

import { WIZARD_STEPS, type WizardStepDef } from "./step-order";

// ---------------------------------------------------------------------------
// Props (server-fetched library data, passed in once from the layout)
// ---------------------------------------------------------------------------

export interface WizardClass {
  id: string | null;
  name: string;
  slug: string;
  system: "PATHFINDER_1E" | "SPHERES_OF_POWER";
  description: string;
  group: string;
  groupKey: string;
  hitDie: number;
  babProgression: "FULL" | "THREE_QUARTER" | "HALF";
  fortProgression: "GOOD" | "POOR";
  refProgression: "GOOD" | "POOR";
  willProgression: "GOOD" | "POOR";
  skillRanksPerLevel: number;
  classSkills: string[];
  classData: SphereClassData | null;
  features: {
    name: string;
    level: number;
    description: string;
    /** Every level this feature is gained at (e.g. a recurring feature). */
    allLevels: number[];
    isChoice: boolean;
  }[];
}

export interface SkillLite {
  id: string;
  name: string;
  keyAbility: AbilityKey;
  trainedOnly: boolean;
  armorCheckPenalty: boolean;
  description: string;
}
export interface FeatLite {
  id: string;
  name: string;
  featTypes: string[];
  /** Magic sphere(s) this feat is tied to (e.g. ["Destruction"]), when it's
   * a sphere feat — a feat can require, or offer a choice of, more than one. */
  sphereNames: string[];
  prerequisites: string;
  benefit: string;
  /** Deep link to this feat's entry on the source wiki page. */
  sourceUrl: string;
}
export interface SphereLite {
  id: string;
  name: string;
  type: string;
  description: string;
}
export interface TalentLite {
  id: string;
  name: string;
  sphereName: string;
  description: string;
  /** e.g. "discipline" for an Equipment sphere discipline talent. */
  talentTypes: string[];
  /** Deep link to this talent's entry on the source wiki page. */
  sourceUrl: string;
}
export interface ItemLite {
  id: string;
  name: string;
  type: string;
  costCp: number;
  weight: number;
}

export interface TraditionDrawbackLite {
  id: string;
  name: string;
  description: string;
  /** Combat sphere name — only set for martial (sphere-specific) drawbacks. */
  sphereName: string;
  costInDrawbacks: number;
  prerequisites: string[];
  incompatibleWith: string[];
}
export interface TraditionBoonLite {
  id: string;
  name: string;
  description: string;
  costInDrawbacks: number;
  prerequisites: string[];
  repeatable: boolean;
  grants: { type: "sphere" | "talent" | "feat"; name: string }[];
}

export interface WizardData {
  classes: WizardClass[];
  skills: SkillLite[];
  feats: FeatLite[];
  spheres: SphereLite[];
  talents: TalentLite[];
  items: ItemLite[];
  castingDrawbacks: TraditionDrawbackLite[];
  castingBoons: TraditionBoonLite[];
  martialDrawbacks: TraditionDrawbackLite[];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface FeatPick {
  key: string;
  featId?: string;
  name: string;
  level: number;
  /** Per the Spheres of Power "trade a bonus feat for a talent" rule: this
   * slot grants an extra magic/combat talent slot instead of a feat. When
   * set, `name`/`featId` are unused — the actual talent is picked on the
   * Spheres & Talents step, which folds this into the matching bucket's
   * total (see spheres-step.tsx). */
  tradedFor?: "magic" | "combat";
}
export interface SpherePick {
  key: string;
  sphereId?: string;
  name: string;
}
export interface TalentPick {
  key: string;
  talentId?: string;
  name: string;
  sphereName: string;
}
export interface EquipPick {
  key: string;
  itemId?: string;
  name: string;
  quantity: number;
  costCp: number;
  weight: number;
  equipped: boolean;
}

/**
 * Mirrors the wiki's "Creating New Martial Traditions" guideline: the
 * Equipment sphere is always granted; `disciplineTalentId` is the required
 * Equipment discipline talent pick, `secondTalentId` a second non-legendary
 * Equipment talent (discipline or not); `baseSphere` the chosen base
 * martial sphere; and `bonusChoice` picks the tradition's one thematic
 * bonus — an additional base sphere, a (freeform) talent from the base
 * sphere, or a non-discipline Equipment talent.
 */
export interface MartialTraditionPick {
  disciplineTalentId: string | null;
  secondTalentId: string | null;
  baseSphere: string | null;
  bonusChoice: "sphere" | "talent" | "equipment" | null;
  bonusSphere: string | null;
  /** A talent id from the `data.talents` pool for the chosen `baseSphere`. */
  bonusTalentId: string | null;
  bonusEquipmentTalentId: string | null;
}

export interface WizardState {
  system: "PATHFINDER_1E" | "SPHERES_OF_POWER";
  classKey: string;
  className: string;
  archetype: string;
  level: number;
  /** Flavor text from the class's scraped per-race favored class bonuses — there is no mechanical favored-class-bonus concept in this app. */
  favoredBonusNote: string;
  /** The ability governing spell points/casting — chosen from Int/Wis/Cha
   * unless the class fixes one (see CLASS_CREATION_STEPS[x].castingAbility). */
  castingAbility: CastingAbilityKey | null;
  /** Set by the tradition builder when the player builds their own casting tradition. */
  customCastingTradition: {
    drawbackIds: string[];
    boonIds: string[];
    /** Sphere-specific drawback ids — a separate mechanic from the general
     * drawback/boon economy; each grants a bonus talent in its sphere. */
    sphereDrawbackIds: string[];
  } | null;
  /** Set by the martial tradition builder — see `MartialTraditionPick`. */
  customMartialTradition: MartialTraditionPick | null;
  name: string;

  raceKey: string;
  race: string;
  alignment: string;
  deity: string;
  gender: string;
  age: string;
  size: string;
  baseSpeed: number;
  racial: Partial<Record<AbilityKey, number>>;

  abilityMethod: AbilityMethod;
  pointBuyBudget: number;
  abilities: Record<AbilityKey, number>;
  rolled: number[] | null;

  choices: Record<string, string[]>;
  skillRanks: Record<string, number>;
  feats: FeatPick[];
  spheres: SpherePick[];
  talents: TalentPick[];
  startingGold: number;
  equipment: EquipPick[];
  webhook: string;
}

type Action =
  | { type: "patch"; patch: Partial<WizardState> }
  | { type: "apply"; fn: (s: WizardState) => Partial<WizardState> };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "apply":
      return { ...state, ...action.fn(state) };
  }
}

const PRESET_CLASSES: WizardClass[] = CLASS_PRESETS.map((p) => ({
  id: null,
  name: p.name,
  slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  system: "PATHFINDER_1E",
  description: "",
  group: "Pathfinder 1e",
  groupKey: "pf1e",
  hitDie: p.hitDie,
  babProgression: p.babProgression,
  fortProgression: p.fortProgression,
  refProgression: p.refProgression,
  willProgression: p.willProgression,
  skillRanksPerLevel: p.skillRanksPerLevel,
  classSkills: [],
  classData: null,
  features: [],
}));

function initialState(firstClass: WizardClass): WizardState {
  return {
    system: firstClass.system,
    classKey: firstClass.name,
    className: firstClass.name,
    archetype: "",
    level: 1,
    favoredBonusNote: "",
    castingAbility: null,
    customCastingTradition: null,
    customMartialTradition: null,
    name: "",
    raceKey: "",
    race: "",
    alignment: "",
    deity: "",
    gender: "",
    age: "",
    size: "MEDIUM",
    baseSpeed: 30,
    racial: {},
    abilityMethod: "manual",
    pointBuyBudget: 15,
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    rolled: null,
    choices: {},
    skillRanks: {},
    feats: [],
    spheres: [],
    talents: [],
    startingGold: 0,
    equipment: [],
    webhook: "",
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface WizardContextValue {
  state: WizardState;
  data: WizardData;
  update: (patch: Partial<WizardState>) => void;
  apply: (fn: (s: WizardState) => Partial<WizardState>) => void;
  setChoice: (stepId: string, values: string[]) => void;
  selectedClass: WizardClass;
  chassis: {
    name: string;
    hitDie: number;
    skillRanksPerLevel: number;
    babProgression: WizardClass["babProgression"];
  };
  finalAbilities: Record<AbilityKey, number>;
  /** Derived from the chosen race — "should be calculated following race selection," not toggled by hand. */
  isHuman: boolean;
  stepPlan: CreationChoiceStep[];
  planTabs: Map<StepTab, CreationChoiceStep[]>;
  enabledSteps: WizardStepDef[];
  skillBudget: number;
  skillSpent: number;
  problems: string[];
  pending: boolean;
  submit: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside <WizardProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WizardProvider({
  children,
  ...props
}: WizardData & { children: ReactNode }) {
  const allClasses = props.classes.length > 0 ? props.classes : PRESET_CLASSES;
  const data: WizardData = { ...props, classes: allClasses };

  // TEMP: Spheres of Power only, per request — prefer a Spheres of Power
  // class as the starting pick so the initial system/class stay consistent
  // (system-step.tsx only offers Spheres of Power right now). Falls back to
  // whatever's first if none exist, same as before.
  const firstClass =
    allClasses.find((c) => c.system === "SPHERES_OF_POWER") ?? allClasses[0];
  const [state, dispatch] = useReducer(reducer, firstClass, initialState);
  const [pending, startTransition] = useTransition();

  const update = (patch: Partial<WizardState>) =>
    dispatch({ type: "patch", patch });
  const apply = (fn: (s: WizardState) => Partial<WizardState>) =>
    dispatch({ type: "apply", fn });
  const setChoice = (stepId: string, values: string[]) =>
    dispatch({
      type: "apply",
      fn: (s) => ({ choices: { ...s.choices, [stepId]: values } }),
    });

  const selectedClass = useMemo(
    () =>
      data.classes.find((c) => c.name === state.classKey) ?? data.classes[0],
    [data.classes, state.classKey],
  );

  const chassis = useMemo(
    () => ({
      name: state.className.trim() || selectedClass.name,
      hitDie: selectedClass.hitDie,
      skillRanksPerLevel: selectedClass.skillRanksPerLevel,
      babProgression: selectedClass.babProgression,
    }),
    [selectedClass, state.className],
  );

  const finalAbilities = useMemo(() => {
    const out = { ...state.abilities };
    for (const k of ABILITIES) out[k] += state.racial[k] ?? 0;
    return out;
  }, [state.abilities, state.racial]);

  const isHuman = isHumanRace(state.race);

  const stepPlan = useMemo(
    () =>
      buildStepPlan({
        className: selectedClass.name,
        classSlug: selectedClass.slug,
        system: state.system,
        group: selectedClass.groupKey,
        level: state.level,
        classData: selectedClass.classData,
        features: selectedClass.features,
        isHuman,
      }),
    [selectedClass, state.system, state.level, isHuman],
  );

  const planTabs = useMemo(() => stepsByTab(stepPlan), [stepPlan]);

  const enabledSteps = useMemo(
    () => WIZARD_STEPS.filter((s) => s.enabled(state, planTabs)),
    [state, planTabs],
  );

  const intMod = abilityModifier(finalAbilities.INT);
  const skillBudget = skillRanksBudget({
    classRanksPerLevel: chassis.skillRanksPerLevel,
    intMod,
    level: state.level,
    human: isHuman,
  });
  const skillSpent = Object.values(state.skillRanks).reduce(
    (a, b) => a + (b || 0),
    0,
  );
  const pointBuySpent = pointBuyTotal(state.abilities);
  const pointBuyOver =
    state.abilityMethod === "point-buy" &&
    pointBuySpent > state.pointBuyBudget;

  const problems: string[] = [];
  if (!state.name.trim()) problems.push("Name your character.");
  if (pointBuyOver)
    problems.push(
      `Point buy is over budget (${pointBuySpent}/${state.pointBuyBudget}).`,
    );
  if (skillSpent > skillBudget)
    problems.push(`Skill ranks over budget (${skillSpent}/${skillBudget}).`);

  function submit() {
    if (problems.length) {
      toast.error(problems[0]);
      return;
    }
    startTransition(async () => {
      const res = await createCharacter({
        name: state.name.trim(),
        system: state.system,
        race: state.race.trim(),
        alignment: state.alignment.trim(),
        deity: state.deity.trim(),
        gender: state.gender.trim(),
        age: state.age ? Number(state.age) : undefined,
        size: state.size as never,
        baseSpeed: state.baseSpeed,
        className: chassis.name,
        archetype: state.archetype.trim(),
        classLevel: state.level,
        gameClassId: selectedClass.id ?? undefined,
        favoredBonusNote: state.favoredBonusNote.trim(),
        castingAbility: state.castingAbility ?? undefined,
        customCastingTradition: state.customCastingTradition ?? undefined,
        customMartialTradition: state.customMartialTradition ?? undefined,
        hitDie: selectedClass.hitDie,
        skillRanksPerLevel: selectedClass.skillRanksPerLevel,
        babProgression: selectedClass.babProgression,
        fortProgression: selectedClass.fortProgression,
        refProgression: selectedClass.refProgression,
        willProgression: selectedClass.willProgression,
        abilities: state.abilities,
        abilityMethod: state.abilityMethod,
        pointBuyBudget:
          state.abilityMethod === "point-buy"
            ? state.pointBuyBudget
            : undefined,
        racialAdjustments: state.racial,
        choices: state.choices,
        skillRanks: Object.entries(state.skillRanks)
          .filter(([, r]) => r > 0)
          .map(([skillId, ranks]) => ({
            skillId,
            ranks,
            isClassSkill: false,
          })),
        feats: state.feats
          .filter((f) => f.name.trim() || f.tradedFor)
          .map((f) => ({
            featId: f.tradedFor ? undefined : f.featId,
            name: f.tradedFor
              ? `Traded for a ${f.tradedFor === "magic" ? "Magic" : "Combat"} Talent`
              : f.name.trim(),
            takenAtLevel: f.level,
          })),
        spheres: state.spheres
          .filter((s) => s.name.trim())
          .map((s) => ({ sphereId: s.sphereId, name: s.name.trim() })),
        talents: state.talents
          .filter((t) => t.name.trim())
          .map((t) => ({
            talentId: t.talentId,
            name: t.name.trim(),
            sphereName: t.sphereName,
          })),
        equipment: state.equipment
          .filter((e) => e.name.trim())
          .map((e) => ({
            itemId: e.itemId,
            name: e.name.trim(),
            quantity: e.quantity,
            costCp: e.costCp,
            weight: e.weight,
            equipped: e.equipped,
          })),
        startingGoldCp: Math.round(state.startingGold * 100),
        discordWebhookUrl: state.webhook.trim(),
      });
      if (res?.error) toast.error(res.error);
    });
  }

  const ctx: WizardContextValue = {
    state,
    data,
    update,
    apply,
    setChoice,
    selectedClass,
    chassis,
    finalAbilities,
    isHuman,
    stepPlan,
    planTabs,
    enabledSteps,
    skillBudget,
    skillSpent,
    problems,
    pending,
    submit,
  };

  return (
    <WizardContext.Provider value={ctx}>{children}</WizardContext.Provider>
  );
}
