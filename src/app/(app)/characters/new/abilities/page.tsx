import type { Metadata } from "next";

import { AbilitiesStep } from "@/components/character/create-wizard/steps/abilities-step";

export const metadata: Metadata = { title: "New character — Abilities" };

export default function AbilitiesPage() {
  return <AbilitiesStep />;
}
