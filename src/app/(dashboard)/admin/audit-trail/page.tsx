import type { Metadata } from "next";
import { AuditTrailPage } from "@/features/audit-trail";

export const metadata: Metadata = { title: "Audit trail" };

export default function AdminAuditTrailRoute() {
  return <AuditTrailPage />;
}
