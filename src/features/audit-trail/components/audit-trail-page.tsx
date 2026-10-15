"use client";

import { HistoryIcon } from "lucide-react";
import { DataTable, DataTablePagination, DataTableToolbar, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useGetAuditTrailQuery, type AuditEvent } from "@/features/reports";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useUrlFilter } from "@/hooks/use-url-filter";
import type { StatusTone } from "@/lib/domain";
import { formatDateTime } from "@/lib/utils";

const actions: { value: string; label: string; tone: StatusTone }[] = [
  { value: "SIGNED_IN", label: "Signed in", tone: "neutral" },
  { value: "RUN_CREATED", label: "Run created", tone: "info" },
  { value: "EVIDENCE_UPLOADED", label: "Evidence uploaded", tone: "info" },
  { value: "NA_PROPOSED", label: "NA proposed", tone: "neutral" },
  { value: "ITEM_STAMPED", label: "Item stamped", tone: "primary" },
  { value: "ITEMS_BULK_STAMPED", label: "Items bulk stamped", tone: "primary" },
  { value: "REVIEW_STARTED", label: "Review started", tone: "warning" },
  { value: "WINDOW2_OPENED", label: "Window 2 opened", tone: "warning" },
  { value: "WINDOW2_CLOSED", label: "Window 2 closed", tone: "warning" },
  { value: "REVIEW_ENDED", label: "Review ended", tone: "warning" },
  { value: "RUN_PUBLISHED", label: "Run published", tone: "success" },
  { value: "REMEDIATION_UPLOADED", label: "Remediation uploaded", tone: "info" },
  { value: "FINDING_RESOLVED", label: "Finding resolved", tone: "success" },
  { value: "FINDING_OPEN", label: "Finding reopened", tone: "danger" },
  { value: "UNIT_CLOSED", label: "Unit closed", tone: "danger" },
  { value: "UNIT_REOPENED", label: "Unit reopened", tone: "success" },
  { value: "VENDOR_ASSIGNED", label: "Vendor assigned", tone: "info" },
  { value: "CHECKLIST_VERSION", label: "Checklist version", tone: "violet" },
  { value: "USER_CREATED", label: "User created", tone: "info" },
  { value: "PASSWORD_RESET", label: "Password reset", tone: "warning" },
  { value: "CREATED", label: "Master created", tone: "info" },
  { value: "UPDATED", label: "Master updated", tone: "neutral" },
  { value: "DEACTIVATED", label: "Deactivated", tone: "danger" },
  { value: "REACTIVATED", label: "Reactivated", tone: "success" },
];
const byValue = new Map(actions.map((a) => [a.value, a]));

const columns: DataTableColumn<AuditEvent>[] = [
  {
    accessorKey: "at",
    header: "When",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground tabular">{formatDateTime(row.original.at)}</span>
    ),
    meta: { className: "w-44" },
  },
  {
    accessorKey: "actorName",
    header: "Who",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.actorName}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{row.original.actorRole}</span>
      </div>
    ),
    meta: { className: "hidden w-48 md:table-cell" },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const meta = byValue.get(row.original.action);
      return <StatusBadge tone={meta?.tone ?? "neutral"} label={meta?.label ?? row.original.action} dot={false} />;
    },
    meta: { className: "w-48" },
  },
  {
    accessorKey: "summary",
    header: "Details",
    cell: ({ row }) => <span className="line-clamp-2 min-w-64">{row.original.summary}</span>,
  },
];

/** §12.13 — who did what, when. Read-only, newest first. */
export function AuditTrailPage() {
  const table = useTableUrlState();
  const [action, setAction] = useUrlFilter("action", table.resetPage);
  const { data, isLoading, isFetching } = useGetAuditTrailQuery({ ...table.request, action: action || undefined });

  return (
    <>
      <PageHeader
        title="Audit trail"
        description="Every sign-in, upload, stamp, phase change, publish, finding update and master-data change, newest first."
      />
      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search person or details…"
          filters={<FilterSelect label="Action" value={action} onChange={setAction} options={actions} />}
        />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(e) => e.id}
          isLoading={isLoading}
          isFetching={isFetching}
          empty={
            <EmptyState
              icon={HistoryIcon}
              title="No activity recorded yet"
              description="Actions appear here as people use the system."
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
            noun="events"
          />
        )}
      </div>
    </>
  );
}
