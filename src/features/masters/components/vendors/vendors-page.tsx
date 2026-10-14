"use client";

import { PencilIcon, PlusIcon, PowerIcon, TruckIcon } from "lucide-react";
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
import { formatDate } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { VendorSummary } from "@/types/domain";
import { useGetVendorsQuery, useSetVendorStatusMutation } from "../../api/vendors.api";
import { VendorFormDialog } from "./vendor-form-dialog";

export function VendorsPage() {
  const canManage = useCan(Permission.MASTERS_MANAGE);
  const table = useTableUrlState("name,asc");
  const [status, setStatus] = useUrlFilter("status", table.resetPage);
  const { data, isLoading, isFetching } = useGetVendorsQuery({ ...table.request, active: toActiveParam(status) });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorSummary | null>(null);
  const [statusTarget, setStatusTarget] = useState<VendorSummary | null>(null);
  const [setVendorStatus, statusState] = useSetVendorStatusMutation();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const columns: DataTableColumn<VendorSummary>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "activeUnitCount",
      header: ({ column }) => <SortableHeader column={column} title="Active units" />,
      cell: ({ row }) => <span className="tabular">{row.original.activeUnitCount}</span>,
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
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title="Last updated" />,
      cell: ({ row }) => <span className="text-muted-foreground tabular">{formatDate(row.original.updatedAt)}</span>,
      meta: { className: "w-36" },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { className: "w-12 text-right" },
      cell: ({ row }) =>
        canManage ? (
          <RowActions
            label={`Actions for ${row.original.name}`}
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
        title="Vendors"
        description="Contractors supplying workers to Principal Employers. Unit links are managed under Assignments."
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <PlusIcon /> Add vendor
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search vendors…"
          filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={activeOptions} />}
        />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(v) => v.id}
          isLoading={isLoading}
          isFetching={isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          empty={
            <EmptyState
              icon={TruckIcon}
              title={hasFilters ? "No vendors match your filters" : "No vendors yet"}
              description={
                hasFilters ? "Try a different search or clear the filters." : "Add the first vendor to get started."
              }
              className="rounded-none border-0"
              action={
                !hasFilters && canManage ? (
                  <Button variant="outline" onClick={openCreate}>
                    <PlusIcon /> Add vendor
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
            noun="vendors"
          />
        )}
      </div>

      <VendorFormDialog open={formOpen} onOpenChange={setFormOpen} vendor={editing} />
      <StatusChangeDialog
        target={statusTarget}
        onClose={() => setStatusTarget(null)}
        entityLabel="vendor"
        isPending={statusState.isLoading}
        onConfirm={async () => {
          if (!statusTarget) return;
          try {
            await setVendorStatus({ id: statusTarget.id, isActive: !statusTarget.isActive }).unwrap();
            toast.success(statusTarget.isActive ? "Vendor deactivated" : "Vendor reactivated", {
              description: statusTarget.name,
            });
            setStatusTarget(null);
          } catch (error) {
            toast.error((error as ApiError).message);
          }
        }}
      />
    </>
  );
}
