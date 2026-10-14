"use client";

import { ArrowLeftIcon, ClipboardCheckIcon } from "lucide-react";
import Link from "next/link";
import { type DataTableColumn, DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cadenceMeta, complianceMeta, formatScore, runPhaseMeta, submissionMeta } from "@/lib/domain";
import { formatDateRange } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { AuditItemResult } from "@/types/domain";
import { useGetAuditRunQuery, useGetRunItemsQuery } from "../api/audit-runs.api";

const columns: DataTableColumn<AuditItemResult>[] = [
  {
    accessorKey: "actNameSnapshot",
    header: "Act",
    cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.actNameSnapshot}</span>,
    meta: { className: "w-24" },
  },
  {
    accessorKey: "descriptionSnapshot",
    header: "Requirement",
    cell: ({ row }) => <span className="line-clamp-2 min-w-64">{row.original.descriptionSnapshot}</span>,
  },
  {
    accessorKey: "cadenceSnapshot",
    header: "Cadence",
    cell: ({ row }) => <StatusBadge meta={cadenceMeta[row.original.cadenceSnapshot]} dot={false} />,
    meta: { className: "w-28" },
  },
  {
    id: "period",
    header: "Period",
    cell: ({ row }) =>
      row.original.periodStart ? (
        <span className="tabular">{formatDateRange(row.original.periodStart, row.original.periodEnd)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    meta: { className: "w-44" },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.complianceStatus ? (
          <StatusBadge meta={complianceMeta[row.original.complianceStatus]} />
        ) : (
          <StatusBadge meta={submissionMeta[row.original.submissionStatus]} draft />
        )}
        {row.original.isCarriedForward && <StatusBadge tone="violet" label="Carried forward" dot={false} />}
      </div>
    ),
    meta: { className: "w-56" },
  },
];

/** Run overview + item list. The evidence/review workspace arrives in Step 6. */
export function AuditRunDetailPage({ runId }: { runId: string }) {
  const { data: run, error } = useGetAuditRunQuery(runId);
  const { data: items, isLoading } = useGetRunItemsQuery(runId);

  if ((error as ApiError | undefined)?.status === 404) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title="Audit run not found"
        description="It may not exist, or you don't have access to it."
      />
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/audit-runs">
          <ArrowLeftIcon /> Audit runs
        </Link>
      </Button>
      {!run ? (
        <Skeleton className="h-12 w-96" />
      ) : (
        <PageHeader
          title={`${run.code} · ${run.partyName}`}
          badge={<StatusBadge meta={runPhaseMeta[run.phase]} />}
          description={`${run.auditType === "VENDOR" ? "Vendor audit" : "PE audit"} · ${run.unitCode} ${run.unitName} · ${run.peName}`}
        />
      )}
      {run && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard
            label="Activity period"
            value={<span className="text-base">{formatDateRange(run.activityPeriodStart, run.activityPeriodEnd)}</span>}
          />
          <KpiCard
            label="Window 1"
            value={<span className="text-base">{formatDateRange(run.window1Start, run.window1End)}</span>}
          />
          <KpiCard label="Items" value={run.score.assignedTotal} hint={`${run.score.pending} awaiting review`} />
          <KpiCard label="Carried forward" value={items?.filter((i) => i.isCarriedForward).length ?? "—"} />
          <KpiCard label="Score" value={formatScore(run.score)} tone="primary" hint="(C + NA) ÷ items" />
        </div>
      )}
      <DataTable
        columns={columns}
        data={items}
        getRowId={(i) => i.id}
        isLoading={isLoading}
        empty={<EmptyState icon={ClipboardCheckIcon} title="No items in this run" className="rounded-none border-0" />}
      />
    </>
  );
}
