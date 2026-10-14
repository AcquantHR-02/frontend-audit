import type { Metadata } from "next";
import { AuditRunDetailPage } from "@/features/audit-runs";

export const metadata: Metadata = { title: "Audit run" };

export default async function AuditRunRoute({ params }: PageProps<"/audit-runs/[runId]">) {
  const { runId } = await params;
  return <AuditRunDetailPage runId={runId} />;
}
