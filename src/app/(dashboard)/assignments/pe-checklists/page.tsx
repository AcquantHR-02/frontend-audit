import type { Metadata } from "next";
import { PEChecklistsPage } from "@/features/assignments";

export const metadata: Metadata = { title: "PE checklists" };

export default function PeChecklistsRoute() {
  return <PEChecklistsPage />;
}
