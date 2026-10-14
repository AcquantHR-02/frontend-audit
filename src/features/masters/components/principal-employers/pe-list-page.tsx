"use client";

import { BuildingIcon, ExternalLinkIcon, PencilIcon, PlusIcon, PowerIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import type { PrincipalEmployerSummary } from "@/types/domain";
import {
  useGetPrincipalEmployersQuery,
  useSetPrincipalEmployerStatusMutation,
} from "../../api/principal-employers.api";
import { PrincipalEmployerFormDialog } from "./pe-form-dialog";

export const peDetailHref = (id: string) => `/masters/principal-employers/${id}`;

export function PrincipalEmployerListPage() {
  const router = useRouter();
  const canManage = useCan(Permission.MASTERS_MANAGE);
  const table = useTableUrlState("name,asc");
  const [status, setStatus] = useUrlFilter("status", table.resetPage);
  const { data, isLoading, isFetching } = useGetPrincipalEmployersQuery({
    ...table.request,
    active: toActiveParam(status),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PrincipalEmployerSummary | null>(null);
  const [statusTarget, setStatusTarget] = useState<PrincipalEmployerSummary | null>(null);
  const [setPeStatus, statusState] = useSetPrincipalEmployerStatusMutation();

  const columns: DataTableColumn<PrincipalEmployerSummary>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title="Principal Employer" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.legalName}</span>
        </div>
      ),
    },
    {
      accessorKey: "unitCount",
      header: ({ column }) => <SortableHeader column={column} title="Units" />,
      cell: ({ row }) => (
        <span className="tabular">
          {row.original.openUnitCount} open
          {row.original.unitCount > row.original.openUnitCount && (
            <span className="text-muted-foreground">
              {" "}
              · {row.original.unitCount - row.original.openUnitCount} closed
            </span>
          )}
        </span>
      ),
      meta: { className: "w-44" },
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
      cell: ({ row }) => (
        <RowActions
          label={`Actions for ${row.original.name}`}
          actions={[
            { label: "Open", icon: ExternalLinkIcon, onSelect: () => router.push(peDetailHref(row.original.id)) },
            {
              label: "Edit",
              icon: PencilIcon,
              hidden: !canManage,
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
              hidden: !canManage,
              onSelect: () => setStatusTarget(row.original),
            },
          ]}
        />
      ),
    },
  ];

  const hasFilters = !!table.search || !!status;

  return (
    <>
      <PageHeader
        title="Principal Employers"
        description="Companies engaging contractors, and their units. Open a Principal Employer to manage its units."
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon /> Add Principal Employer
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search by name or legal name…"
          filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={activeOptions} />}
        />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(p) => p.id}
          isLoading={isLoading}
          isFetching={isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          onRowClick={(pe) => router.push(peDetailHref(pe.id))}
          skeletonRows={4}
          empty={
            <EmptyState
              icon={BuildingIcon}
              title={hasFilters ? "No Principal Employers match your filters" : "No Principal Employers yet"}
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
            noun="Principal Employers"
          />
        )}
      </div>

      <PrincipalEmployerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        principalEmployer={editing}
        onCreated={(pe) => router.push(peDetailHref(pe.id))}
      />
      <StatusChangeDialog
        target={statusTarget}
        onClose={() => setStatusTarget(null)}
        entityLabel="Principal Employer"
        isPending={statusState.isLoading}
        onConfirm={async () => {
          if (!statusTarget) return;
          try {
            await setPeStatus({ id: statusTarget.id, isActive: !statusTarget.isActive }).unwrap();
            toast.success(statusTarget.isActive ? "Principal Employer deactivated" : "Principal Employer reactivated");
            setStatusTarget(null);
          } catch (error) {
            toast.error((error as ApiError).message);
          }
        }}
      />
    </>
  );
}
