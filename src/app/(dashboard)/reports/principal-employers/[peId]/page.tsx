import type { Metadata } from "next";
import { ScorecardPage } from "@/features/reports";

export const metadata: Metadata = { title: "PE scorecard" };

export default async function PeScorecardRoute({ params }: PageProps<"/reports/principal-employers/[peId]">) {
  const { peId } = await params;
  return <ScorecardPage auditType="PE" partyId={peId} />;
}
