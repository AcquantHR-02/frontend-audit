"use client";

import { ShieldAlertIcon } from "lucide-react";
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
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { isAuditor } from "@/lib/auth";
import { auditTypeMeta, findingMeta } from "@/lib/domain";
import { formatDate, formatDateRange } from "@/lib/utils";
import type { AuditType, FindingStatus, FindingView } from "@/types/domain";
import { useGetFindingsQuery, useGetFindingsSummaryQuery } from "../api/findings.api";

const statusOptions = (Object.keys(findingMeta) as FindingStatus[]).map((s) => ({
  value: s,
  label: findingMeta[s].label,
}));
const typeOptions = (Object.keys(auditTypeMeta) as AuditType[]).map((t) => ({
  value: t,
  label: auditTypeMeta[t].label,
}));

export function FindingsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const table = useTableUrlState("createdAt,desc");
  const [status, setStatus] = useUrlFilter("status", table.resetPage);
  const [type, setType] = useUrlFilter("type", table.resetPage);
  const { data: summary } = useGetFindingsSummaryQuery();
  const { data, isLoading, isFetching } = useGetFindingsQuery({
    ...table.request,
    status: (status || undefined) as FindingStatus | undefined,
    auditType: (type || undefined) as AuditType | undefined,
  });

  const columns: DataTableColumn<FindingView>[] = [
    {
      accessorKey: "requirement",
      header: "Finding",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex min-w-48 flex-col sm:min-w-64">
          <span className="line-clamp-2 font-medium">{row.original.requirement}</span>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">{row.original.actName}</span>
            {row.original.periodStart && ` · ${formatDateRange(row.original.periodStart, row.original.periodEnd)}`}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "partyName",
      header: ({ column }) => <SortableHeader column={column} title="Audited party" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.original.partyName}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.unitCode} · <span className="font-mono">{row.original.runCode}</span>
          </span>
        </div>
      ),
      meta: { className: "w-56" },
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge meta={findingMeta[row.original.status]} />
          {row.original.status === "OPEN" && row.original.attachmentCount > 0 && (
            <StatusBadge tone="warning" label="Remediation submitted" dot={false} />
          )}
        </div>
      ),
      meta: { className: "w-56" },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column} title="Opened" />,
      cell: ({ row }) => <span className="text-muted-foreground tabular">{formatDate(row.original.createdAt)}</span>,
      meta: { className: "hidden w-28 md:table-cell" },
    },
  ];

  return (
    <>
      <PageHeader
        title="Findings"
        description={
          isAuditor(user)
            ? "Non-compliances opened when runs are published. Review remediation and mark findings resolved."
            : "Items found not complied in your published audits. Upload remediation evidence for open findings."
        }
      />
      <div className="grid grid-cols-3 gap-3 sm:max-w-2xl">
        <KpiCard label="Open" value={summary?.open ?? "—"} tone={summary?.open ? "danger" : undefined} />
        <KpiCard label="Remediation submitted" value={summary?.awaitingReview ?? "—"} tone="warning" />
        <KpiCard label="Resolved" value={summary?.resolved ?? "—"} tone="success" />
      </div>
      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search requirement, party, unit or run…"
          filters={
            <>
              <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
              <FilterSelect label="Type" value={type} onChange={setType} options={typeOptions} />
            </>
          }
        />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(f) => f.id}
          isLoading={isLoading}
          isFetching={isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(f) => router.push(`/findings/${f.id}`)}
          empty={
            <EmptyState
              icon={ShieldAlertIcon}
              title={table.search || status || type ? "No findings match your filters" : "No findings"}
              description="Findings appear when a run is published with items marked not complied."
              className="rounded-none border-0"
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
            noun="findings"
          />
        )}
      </div>
    </>
  );
}
