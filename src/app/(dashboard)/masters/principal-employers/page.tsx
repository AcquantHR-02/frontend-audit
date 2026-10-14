import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Principal employers" };

export default function MastersPrincipalEmployersPage() {
  return (
    <ModulePlaceholder
      title="Principal employers"
      description="Principal Employers and their units, including unit closure and reopening."
    />
  );
}
