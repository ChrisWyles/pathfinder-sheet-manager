import type { Metadata } from "next";

import { CastingTraditionStep } from "@/components/character/create-wizard/steps/casting-tradition-step";

export const metadata: Metadata = { title: "New character — Casting tradition" };

export default function CastingTraditionPage() {
  return <CastingTraditionStep />;
}
