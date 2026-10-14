import type { Metadata } from "next";
import { ChecklistMasterPage } from "@/features/masters";

export const metadata: Metadata = { title: "Vendor checklist master" };

export default function MastersChecklistsVendorRoute() {
  return <ChecklistMasterPage kind="vendor" />;
}
