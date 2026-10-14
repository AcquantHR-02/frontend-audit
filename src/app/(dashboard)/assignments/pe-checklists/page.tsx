import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "PE checklists" };

export default function AssignmentsPeChecklistsPage() {
  return (
    <ModulePlaceholder
      title="PE checklists"
      description="Checklist items assigned per Principal Employer, versioned by effective period."
    />
  );
}
