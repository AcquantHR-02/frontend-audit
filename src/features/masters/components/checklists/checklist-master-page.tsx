"use client";

import { BookOpenCheckIcon, PencilIcon, PlusIcon, PowerIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActiveBadge } from "@/components/shared/active-badge";
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
import { RowActions } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatusChangeDialog } from "@/components/shared/status-change-dialog";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-current-user";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { activeOptions, toActiveParam, useUrlFilter } from "@/hooks/use-url-filter";
import { Permission } from "@/lib/auth";
import { cadenceMeta } from "@/lib/domain";
import type { ApiError } from "@/types/api";
import type { Cadence, ChecklistItemView } from "@/types/domain";
import {
  useGetChecklistItemsQuery,
  useSetChecklistItemStatusMutation,
  type ChecklistKind,
} from "../../api/checklist-items.api";
import { useActOptions, useStateOptions } from "../../hooks/use-master-options";
import { ChecklistItemFormDialog } from "./checklist-item-form-dialog";

const copy: Record<ChecklistKind, { title: string; description: string }> = {
  vendor: {
    title: "Vendor checklist master",
    description:
      "Requirements audited at vendors, scoped by state (or national). Assigned per vendor and unit under Assignments.",
  },
  pe: {
    title: "PE checklist master",
    description:
      "Requirements audited at Principal Employers themselves. Assigned per Principal Employer under Assignments.",
  },
};

const cadenceOptions = (Object.keys(cadenceMeta) as Cadence[]).map((c) => ({ value: c, label: cadenceMeta[c].label }));

export function ChecklistMasterPage({ kind }: { kind: ChecklistKind }) {
  const canManage = useCan(Permission.MASTERS_MANAGE);
  const table = useTableUrlState("actShortName,asc");
  const [status, setStatus] = useUrlFilter("status", table.resetPage);
  const [actId, setActId] = useUrlFilter("act", table.resetPage);
  const [scope, setScope] = useUrlFilter("scope", table.resetPage);
  const [cadence, setCadence] = useUrlFilter("cadence", table.resetPage);

  const actOptions = useActOptions({ activeOnly: false });
  const stateOptions = useStateOptions();
  const { data, isLoading, isFetching } = useGetChecklistItemsQuery({
    kind,
    params: {
      ...table.request,
      active: toActiveParam(status),
      actId: actId || undefined,
      stateId: scope || undefined,
      cadence: (cadence || undefined) as Cadence | undefined,
    },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistItemView | null>(null);
  const [statusTarget, setStatusTarget] = useState<ChecklistItemView | null>(null);
  const [setItemStatus, statusState] = useSetChecklistItemStatusMutation();

  const columns: DataTableColumn<ChecklistItemView>[] = [
    {
      accessorKey: "actShortName",
      header: ({ column }) => <SortableHeader column={column} title="Act" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.actShortName}</span>,
      meta: { className: "w-28" },
    },
    {
      accessorKey: "description",
      header: ({ column }) => <SortableHeader column={column} title="Requirement" />,
      cell: ({ row }) => <span className="line-clamp-2 min-w-64">{row.original.description}</span>,
    },
    {
      accessorKey: "stateCode",
      header: ({ column }) => <SortableHeader column={column} title="Scope" />,
      cell: ({ row }) =>
        row.original.stateCode ? (
          <span className="font-mono text-xs">{row.original.stateCode}</span>
        ) : (
          <span className="text-muted-foreground">National</span>
        ),
      meta: { className: "w-28" },
    },
    {
      accessorKey: "cadence",
      header: ({ column }) => <SortableHeader column={column} title="Cadence" />,
      cell: ({ row }) => <StatusBadge meta={cadenceMeta[row.original.cadence]} dot={false} />,
      meta: { className: "w-32" },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
      meta: { className: "w-28" },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { className: "w-12 text-right" },
      cell: ({ row }) =>
        canManage ? (
          <RowActions
            actions={[
              {
                label: "Edit",
                icon: PencilIcon,
                onSelect: () => {
                  setEditing(row.original);
                  setFormOpen(true);
                },
              },
              {
                label: row.original.isActive ? "Deactivate" : "Reactivate",
                icon: PowerIcon,
                destructive: row.original.isActive,
                separated: true,
                onSelect: () => setStatusTarget(row.original),
              },
            ]}
          />
        ) : null,
    },
  ];

  const hasFilters = !!(table.search || status || actId || scope || cadence);

  return (
    <>
      <PageHeader
        title={copy[kind].title}
        description={copy[kind].description}
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon /> Add item
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search requirements…"
          filters={
            <>
              <FilterSelect
                label="Act"
                value={actId}
                onChange={setActId}
                options={actOptions.map((o) => ({ value: o.value, label: o.label.split(" — ")[0] }))}
              />
              <FilterSelect
                label="Scope"
                value={scope}
                onChange={setScope}
                options={[{ value: "NATIONAL", label: "National" }, ...stateOptions]}
              />
              <FilterSelect label="Cadence" value={cadence} onChange={setCadence} options={cadenceOptions} />
              <FilterSelect label="Status" value={status} onChange={setStatus} options={activeOptions} />
            </>
          }
        />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(i) => i.id}
          isLoading={isLoading}
          isFetching={isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          empty={
            <EmptyState
              icon={BookOpenCheckIcon}
              title={hasFilters ? "No items match your filters" : "No checklist items yet"}
              description={hasFilters ? "Try a different search or clear the filters." : undefined}
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
            noun="items"
          />
        )}
      </div>

      <ChecklistItemFormDialog kind={kind} open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <StatusChangeDialog
        target={statusTarget ? { name: statusTarget.description, isActive: statusTarget.isActive } : null}
        onClose={() => setStatusTarget(null)}
        entityLabel="checklist item"
        deactivateNote={<p>Existing audit runs that include this item are not affected.</p>}
        isPending={statusState.isLoading}
        onConfirm={async () => {
          if (!statusTarget) return;
          try {
            await setItemStatus({ kind, id: statusTarget.id, isActive: !statusTarget.isActive }).unwrap();
            toast.success(statusTarget.isActive ? "Item deactivated" : "Item reactivated");
            setStatusTarget(null);
          } catch (error) {
            toast.error((error as ApiError).message);
          }
        }}
      />
    </>
  );
}
