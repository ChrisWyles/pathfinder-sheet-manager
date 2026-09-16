"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { classSkillSet, maxRanksPerSkill } from "@/lib/rules/creation";
import { computeSkillTotal } from "@/lib/rules/skills";
import type { CreatureSizeKey } from "@/lib/rules/types";

import { useWizard } from "../wizard-provider";
import { sign } from "./field";

export function SkillsStep() {
  const {
    state,
    data,
    apply,
    finalAbilities,
    selectedClass,
    skillBudget: budget,
    skillSpent: spent,
  } = useWizard();
  const left = budget - spent;
  const cap = maxRanksPerSkill(state.level);

  const classSkills = useMemo(
    () =>
      classSkillSet(
        selectedClass.classSkills,
        data.skills.map((s) => s.name),
      ),
    [selectedClass.classSkills, data.skills],
  );

  function setRanks(skillId: string, ranks: number) {
    apply((s) => ({
      skillRanks: { ...s.skillRanks, [skillId]: Math.max(0, ranks) },
    }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Skill ranks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Budget <span className="text-foreground font-medium">{budget}</span>
            </span>
            <span className="text-muted-foreground">
              Spent <span className="text-foreground font-medium">{spent}</span>
            </span>
            <span
              className={
                left < 0
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }
            >
              Remaining <span className="font-medium">{left}</span>
            </span>
            <span className="text-muted-foreground">
              Max ranks / skill{" "}
              <span className="text-foreground font-medium">{cap}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Ability</TableHead>
            <TableHead className="text-center">Ranks</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.skills.map((skill) => {
            const ranks = state.skillRanks[skill.id] ?? 0;
            const isClass = classSkills.has(skill.name.toLowerCase());
            const total = computeSkillTotal(
              {
                name: skill.name,
                keyAbility: skill.keyAbility,
                ranks,
                isClassSkill: isClass,
                usesArmorCheckPenalty: skill.armorCheckPenalty,
              },
              {
                abilityScores: finalAbilities,
                armorCheckPenalty: 0,
                size: state.size as CreatureSizeKey,
              },
            );
            return (
              <TableRow key={skill.id}>
                <TableCell>
                  {skill.description ? (
                    <Tooltip>
                      <TooltipTrigger className="cursor-help font-medium underline decoration-dotted underline-offset-2">
                        {skill.name}
                      </TooltipTrigger>
                      <TooltipContent>{skill.description}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="font-medium">{skill.name}</span>
                  )}
                  <span className="ml-2 inline-flex gap-1 align-middle">
                    {isClass && (
                      <Badge variant="secondary" className="text-[10px]">
                        class
                      </Badge>
                    )}
                    {skill.trainedOnly && (
                      <Badge variant="outline" className="text-[10px]">
                        trained
                      </Badge>
                    )}
                    {skill.armorCheckPenalty && (
                      <Badge variant="outline" className="text-[10px]">
                        ACP
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {skill.keyAbility}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRanks(skill.id, ranks - 1)}
                      disabled={ranks <= 0}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center tabular-nums">{ranks}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRanks(skill.id, ranks + 1)}
                      disabled={ranks >= cap}
                    >
                      +
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {sign(total)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {data.skills.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No skills in the library yet — run the seed to populate them.
        </p>
      )}
    </div>
  );
}
