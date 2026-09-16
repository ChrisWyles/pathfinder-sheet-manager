import type { Metadata } from "next";

import { ClassFeaturesStep } from "@/components/character/create-wizard/steps/class-features-step";

export const metadata: Metadata = { title: "New character — Features" };

export default function FeaturesPage() {
  return <ClassFeaturesStep />;
}
