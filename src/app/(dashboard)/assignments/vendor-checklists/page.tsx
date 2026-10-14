import type { Metadata } from "next";
import { VendorChecklistsPage } from "@/features/assignments";

export const metadata: Metadata = { title: "Vendor checklists" };

export default function VendorChecklistsRoute() {
  return <VendorChecklistsPage />;
}
