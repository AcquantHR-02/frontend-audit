import type { Metadata } from "next";
import { PrincipalEmployerDetailPage } from "@/features/masters";

export const metadata: Metadata = { title: "Principal employer" };

export default async function PrincipalEmployerRoute({ params }: PageProps<"/masters/principal-employers/[peId]">) {
  const { peId } = await params;
  return <PrincipalEmployerDetailPage peId={peId} />;
}
