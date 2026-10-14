import { ConstructionIcon } from "lucide-react";
import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";

/** Temporary page body for modules not built yet — keeps every nav link working meanwhile. */
export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={ConstructionIcon}
        title="This module is under construction"
        description="It's part of the build plan and will be available in an upcoming release."
      />
    </>
  );
}
