import type { Metadata } from "next";

import { SystemStep } from "@/components/character/create-wizard/steps/system-step";

export const metadata: Metadata = { title: "New character — System" };

export default function SystemPage() {
  return <SystemStep />;
}
