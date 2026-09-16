import type { Metadata } from "next";

import { SkillsStep } from "@/components/character/create-wizard/steps/skills-step";

export const metadata: Metadata = { title: "New character — Skills" };

export default function SkillsPage() {
  return <SkillsStep />;
}
