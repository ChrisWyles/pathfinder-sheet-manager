import type { Metadata } from "next";

import { ReviewStep } from "@/components/character/create-wizard/steps/review-step";

export const metadata: Metadata = { title: "New character — Review" };

export default function ReviewPage() {
  return <ReviewStep />;
}
