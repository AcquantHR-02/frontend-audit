import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ComponentsSection } from "./_components/components-section";
import { LiveDataSection } from "./_components/live-data-section";
import { StatusSection } from "./_components/status-section";
import { ThemeToggle } from "./_components/theme-toggle";
import { TokensSection } from "./_components/tokens-section";

export const metadata: Metadata = { title: "Design showcase" };

/**
 * TEMPORARY design-review page (Step 1). Removed once the real app shell lands.
 */
export default function ShowcasePage() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <PageHeader
        title="Audit Management System · Design system"
        badge={<StatusBadge tone="primary" label="Foundation preview" />}
        description="Tokens, components and status language shared by every role. Inter for UI, JetBrains Mono for IDs and status codes. Deep-blue primary with navy gradient chrome."
        actions={<ThemeToggle />}
      />
      <TokensSection />
      <StatusSection />
      <ComponentsSection />
      <LiveDataSection />
    </main>
  );
}
