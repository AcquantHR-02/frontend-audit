import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Vendor units" };

export default function AssignmentsVendorUnitsPage() {
  return (
    <ModulePlaceholder
      title="Vendor units"
      description="Which vendors operate at which PE units, with effective periods."
    />
  );
}
