import type { Metadata } from "next";
import { FindingDetailPage } from "@/features/findings";

export const metadata: Metadata = { title: "Finding" };

export default async function FindingRoute({ params }: PageProps<"/findings/[findingId]">) {
  const { findingId } = await params;
  return <FindingDetailPage findingId={findingId} />;
}
