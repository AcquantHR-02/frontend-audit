import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Acts" };

export default function MastersActsPage() {
  return <ModulePlaceholder title="Acts" description="Statutes that checklist items belong to." />;
}
