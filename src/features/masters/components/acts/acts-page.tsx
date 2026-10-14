"use client";

import { PencilIcon, PlusIcon, PowerIcon, ScaleIcon } from "lucide-react";
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
import { StatusChangeDialog } from "@/components/shared/status-change-dialog";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/use-current-user";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { activeOptions, toActiveParam, useUrlFilter } from "@/hooks/use-url-filter";
import { Permission } from "@/lib/auth";
import type { ApiError } from "@/types/api";
import type { ActSummary } from "@/types/domain";
import { useGetActsQuery, useSetActStatusMutation } from "../../api/acts.api";
import { ActFormDialog } from "./act-form-dialog";

export function ActsPage() {
  const canManage = useCan(Permission.MASTERS_MANAGE);
  const table = useTableUrlState("shortName,asc");
  const [status, setStatus] = useUrlFilter("status", table.resetPage);
  const { data, isLoading, isFetching } = useGetActsQuery({ ...table.request, active: toActiveParam(status) });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ActSummary | null>(null);
  const [statusTarget, setStatusTarget] = useState<ActSummary | null>(null);
  const [setActStatus, statusState] = useSetActStatusMutation();

  const columns: DataTableColumn<ActSummary>[] = [
    {
      accessorKey: "shortName",
      header: ({ column }) => <SortableHeader column={column} title="Short name" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.shortName}</span>,
      meta: { className: "w-36" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title="Act" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "category",
      header: ({ column }) => <SortableHeader column={column} title="Category" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.category ?? "—"}</span>,
      meta: { className: "w-40" },
    },
    {
      id: "items",
      header: "Checklist items",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular">
          {row.original.checklistItemCount} vendor · {row.original.peChecklistItemCount} PE
        </span>
      ),
      meta: { className: "w-40" },
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
            label={`Actions for ${row.original.shortName}`}
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

  const hasFilters = !!table.search || !!status;

  return (
    <>
      <PageHeader
        title="Acts"
        description="Statutes that checklist requirements belong to. Independent of other systems' act codes."
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon /> Add Act
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search Acts…"
          filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={activeOptions} />}
        />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(a) => a.id}
          isLoading={isLoading}
          isFetching={isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          empty={
            <EmptyState
              icon={ScaleIcon}
              title={hasFilters ? "No Acts match your filters" : "No Acts yet"}
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
            noun="Acts"
          />
        )}
      </div>

      <ActFormDialog open={formOpen} onOpenChange={setFormOpen} act={editing} />
      <StatusChangeDialog
        target={statusTarget ? { name: statusTarget.shortName, isActive: statusTarget.isActive } : null}
        onClose={() => setStatusTarget(null)}
        entityLabel="Act"
        deactivateNote={<p>Existing checklist items keep working; new items can&apos;t be added under this Act.</p>}
        isPending={statusState.isLoading}
        onConfirm={async () => {
          if (!statusTarget) return;
          try {
            await setActStatus({ id: statusTarget.id, isActive: !statusTarget.isActive }).unwrap();
            toast.success(statusTarget.isActive ? "Act deactivated" : "Act reactivated");
            setStatusTarget(null);
          } catch (error) {
            toast.error((error as ApiError).message);
          }
        }}
      />
    </>
  );
}
