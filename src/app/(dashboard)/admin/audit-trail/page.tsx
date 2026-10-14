import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Audit trail" };

export default function AdminAuditTrailPage() {
  return (
    <ModulePlaceholder
      title="Audit trail"
      description="Who changed what and when, across runs, evidence, findings and masters."
    />
  );
}
