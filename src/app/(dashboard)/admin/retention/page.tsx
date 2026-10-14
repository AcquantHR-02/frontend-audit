import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Retention" };

export default function AdminRetentionPage() {
  return (
    <ModulePlaceholder
      title="Retention"
      description="Runs approaching the 2-financial-year purge, with pre-purge notices and exports."
    />
  );
}
