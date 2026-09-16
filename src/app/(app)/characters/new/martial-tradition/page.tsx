import type { Metadata } from "next";

import { MartialTraditionStep } from "@/components/character/create-wizard/steps/martial-tradition-step";

export const metadata: Metadata = { title: "New character — Martial tradition" };

export default function MartialTraditionPage() {
  return <MartialTraditionStep />;
}
