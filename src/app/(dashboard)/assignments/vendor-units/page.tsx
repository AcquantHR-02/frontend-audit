import type { Metadata } from "next";
import { VendorUnitsPage } from "@/features/assignments";

export const metadata: Metadata = { title: "Vendor units" };

export default function VendorUnitsRoute() {
  return <VendorUnitsPage />;
}
