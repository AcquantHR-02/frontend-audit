import type { Metadata } from "next";
import { AuditRunsPage } from "@/features/audit-runs";

export const metadata: Metadata = { title: "Audit runs" };

export default function AuditRunsRoute() {
  return <AuditRunsPage />;
}
