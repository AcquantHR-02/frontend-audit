import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "States" };

export default function MastersStatesPage() {
  return (
    <ModulePlaceholder
      title="States"
      description="States used to scope Principal Employer units and checklist items."
    />
  );
}
