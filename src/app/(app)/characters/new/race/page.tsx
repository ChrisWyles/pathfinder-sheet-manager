import type { Metadata } from "next";

import { RaceStep } from "@/components/character/create-wizard/steps/race-step";

export const metadata: Metadata = { title: "New character — Race" };

export default function RacePage() {
  return <RaceStep />;
}
