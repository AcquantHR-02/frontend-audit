import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Vendors" };

export default function MastersVendorsPage() {
  return (
    <ModulePlaceholder
      title="Vendors"
      description="Contractors and vendors supplying workers to Principal Employers."
    />
  );
}
