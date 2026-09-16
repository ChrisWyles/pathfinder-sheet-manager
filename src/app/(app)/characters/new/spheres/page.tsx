import type { Metadata } from "next";

import { SpheresStep } from "@/components/character/create-wizard/steps/spheres-step";

export const metadata: Metadata = { title: "New character — Spheres" };

export default function SpheresPage() {
  return <SpheresStep />;
}
