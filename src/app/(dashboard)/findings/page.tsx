import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Findings" };

export default function FindingsPage() {
  return (
    <ModulePlaceholder
      title="Findings"
      description="Non-compliances opened at publish, with remediation evidence and resolution status."
    />
  );
}
