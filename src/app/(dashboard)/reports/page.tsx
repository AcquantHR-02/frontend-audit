import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Detailed audit reports, management score roll-ups and Excel exports."
    />
  );
}
