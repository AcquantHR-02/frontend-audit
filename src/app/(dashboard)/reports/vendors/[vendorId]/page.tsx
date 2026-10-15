import type { Metadata } from "next";
import { ScorecardPage } from "@/features/reports";

export const metadata: Metadata = { title: "Vendor scorecard" };

export default async function VendorScorecardRoute({ params }: PageProps<"/reports/vendors/[vendorId]">) {
  const { vendorId } = await params;
  return <ScorecardPage auditType="VENDOR" partyId={vendorId} />;
}
