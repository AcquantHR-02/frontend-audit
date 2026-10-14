"use client";

import { BarChart3Icon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { roleMeta } from "@/lib/domain";
import type { Role } from "@/types/domain";

interface RoleOverview {
  description: string;
  kpis: string[];
}

/** Role-specific dashboard framing (§18). Live figures arrive with the reporting module. */
const overviewByRole: Record<Role, RoleOverview> = {
  AUDITOR_ADMIN: {
    description: "Organisation-wide status of audit runs, reviews and findings across all Principal Employers.",
    kpis: ["Active audit runs", "Awaiting review", "Open findings", "Published this FY"],
  },
  AUDITOR_USER: {
    description: "Your audit queue: runs in progress, reviews waiting on you and findings to follow up.",
    kpis: ["Active audit runs", "Awaiting review", "Open findings", "Published this FY"],
  },
  VENDOR_USER: {
    description: "Audits across all your units, items waiting for your evidence and findings to remediate.",
    kpis: ["Open audits", "Items to upload", "Open findings", "Latest score"],
  },
  PE_USER: {
    description: "Vendor audit results at your units, your own PE audits and open findings.",
    kpis: ["Vendor audits", "My PE audits", "Open findings", "Average vendor score"],
  },
};

function greeting(date = new Date()) {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function Overview() {
  const user = useCurrentUser();
  if (!user) return null;
  const { description, kpis } = overviewByRole[user.role];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.fullName.split(" ")[0]}`}
        badge={<StatusBadge meta={roleMeta[user.role]} />}
        description={description}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((label) => (
          <KpiCard key={label} label={label} value="—" hint="No data yet" />
        ))}
      </div>
      <EmptyState
        icon={BarChart3Icon}
        title="Your dashboard is getting ready"
        description="Charts, recent audit runs and score trends will appear here as audits are created and published."
      />
    </>
  );
}
