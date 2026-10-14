import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Vendor checklists" };

export default function AssignmentsVendorChecklistsPage() {
  return (
    <ModulePlaceholder
      title="Vendor checklists"
      description="Checklist items assigned per vendor and unit, versioned by effective period."
    />
  );
}
