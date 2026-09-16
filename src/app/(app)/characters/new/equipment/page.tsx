import type { Metadata } from "next";

import { EquipmentStep } from "@/components/character/create-wizard/steps/equipment-step";

export const metadata: Metadata = { title: "New character — Equipment" };

export default function EquipmentPage() {
  return <EquipmentStep />;
}
