import type { Metadata } from "next";

import { FeatsStep } from "@/components/character/create-wizard/steps/feats-step";

export const metadata: Metadata = { title: "New character — Feats" };

export default function FeatsPage() {
  return <FeatsStep />;
}
