"use client";

import { ClipboardCheckIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  SortableHeader,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCan } from "@/hooks/use-current-user";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { Permission } from "@/lib/auth";
import { auditTypeMeta, formatScore, runPhaseMeta } from "@/lib/domain";
import { formatDate, formatDateRange } from "@/lib/utils";
import type { AuditRunView, AuditType, RunPhase } from "@/types/domain";
import { useGetAuditRunsQuery } from "../api/audit-runs.api";

const typeOptions = (Object.keys(auditTypeMeta) as AuditType[]).map((t) => ({
  value: t,
  label: auditTypeMeta[t].label,
}));
const phaseOptions = (Object.keys(runPhaseMeta) as RunPhase[]).map((p) => ({ value: p, label: runPhaseMeta[p].label }));

export function AuditRunsPage() {
  const router = useRouter();
  const canCreate = useCan(Permission.AUDIT_RUNS_CREATE);
  const table = useTableUrlState("createdAt,desc");
  const [type, setType] = useUrlFilter("type", table.resetPage);
  const [phase, setPhase] = useUrlFilter("phase", table.resetPage);
  const { data, isLoading, isFetching } = useGetAuditRunsQuery({
    ...table.request,
    auditType: (type || undefined) as AuditType | undefined,
    phase: (phase || undefined) as RunPhase | undefined,
  });

  const columns: DataTableColumn<AuditRunView>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <SortableHeader column={column} title="Run" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.code}</span>,
      meta: { className: "w-32" },
    },
    {
      accessorKey: "partyName",
      header: ({ column }) => <SortableHeader column={column} title="Audited party" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 font-medium">
            {row.original.partyName}
            <span className="rounded border px-1 font-mono text-[10px] text-muted-foreground">
              {row.original.auditType}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.unitCode} · {row.original.unitName} · {row.original.peName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "activityPeriodStart",
      header: ({ column }) => <SortableHeader column={column} title="Activity period" />,
      cell: ({ row }) => (
        <span className="tabular">
          {formatDateRange(row.original.activityPeriodStart, row.original.activityPeriodEnd)}
        </span>
      ),
      meta: { className: "w-48" },
    },
    {
      accessorKey: "phase",
      header: "Phase",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge meta={runPhaseMeta[row.original.phase]} />,
      meta: { className: "w-36" },
    },
    {
      id: "progress",
      header: "Reviewed",
      enableSorting: false,
      cell: ({ row }) => {
        const { assignedTotal, pending } = row.original.score;
        const done = assignedTotal - pending;
        return (
          <div className="flex items-center gap-2">
            <Progress value={assignedTotal ? (done / assignedTotal) * 100 : 0} className="h-1.5 w-20" />
            <span className="text-xs text-muted-foreground tabular">
              {done}/{assignedTotal}
            </span>
          </div>
        );
      },
      meta: { className: "w-40" },
    },
    {
      id: "score",
      header: "Score",
      enableSorting: false,
      cell: ({ row }) => <span className="font-medium tabular">{formatScore(row.original.score)}</span>,
      meta: { className: "w-20 text-right" },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column} title="Created" />,
      cell: ({ row }) => <span className="text-muted-foreground tabular">{formatDate(row.original.createdAt)}</span>,
      meta: { className: "w-28" },
    },
  ];

  const hasFilters = !!(table.search || type || phase);

  return (
    <>
      <PageHeader
        title="Audit runs"
        description="One run per audited party, unit and activity period."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/audit-runs/new">
                <PlusIcon /> New audit run
              </Link>
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search run, party or unit…"
          filters={
            <>
              <FilterSelect label="Type" value={type} onChange={setType} options={typeOptions} />
              <FilterSelect label="Phase" value={phase} onChange={setPhase} options={phaseOptions} />
            </>
          }
        />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          isFetching={isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(r) => router.push(`/audit-runs/${r.id}`)}
          empty={
            <EmptyState
              icon={ClipboardCheckIcon}
              title={hasFilters ? "No runs match your filters" : "No audit runs yet"}
              description={
                !hasFilters && canCreate ? "Create the first run for a vendor or Principal Employer." : undefined
              }
              className="rounded-none border-0"
              action={
                !hasFilters && canCreate ? (
                  <Button asChild variant="outline">
                    <Link href="/audit-runs/new">
                      <PlusIcon /> New audit run
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          }
        />
        {data && (
          <DataTablePagination
            page={table.page}
            size={table.size}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPageChange={table.setPage}
            onSizeChange={table.setSize}
            noun="runs"
          />
        )}
      </div>
    </>
  );
}
