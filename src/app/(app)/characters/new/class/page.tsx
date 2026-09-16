import type { Metadata } from "next";

import { ClassStep } from "@/components/character/create-wizard/steps/class-step";

export const metadata: Metadata = { title: "New character — Class" };

export default function ClassPage() {
  return <ClassStep />;
}
