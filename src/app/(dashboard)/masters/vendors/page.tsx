import type { Metadata } from "next";
import { VendorsPage } from "@/features/masters";

export const metadata: Metadata = { title: "Vendors" };

export default function MastersVendorsRoute() {
  return <VendorsPage />;
}
