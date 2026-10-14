import type { Metadata } from "next";
import { ChecklistMasterPage } from "@/features/masters";

export const metadata: Metadata = { title: "PE checklist master" };

export default function MastersChecklistsPeRoute() {
  return <ChecklistMasterPage kind="pe" />;
}
