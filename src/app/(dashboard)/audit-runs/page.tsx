import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Audit runs" };

export default function AuditRunsPage() {
  return (
    <ModulePlaceholder
      title="Audit runs"
      description="Every audit run across vendors and Principal Employers, with phase, period and score."
    />
  );
}
