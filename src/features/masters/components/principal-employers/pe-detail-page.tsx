"use client";

import {
  ArrowLeftIcon,
  Building2Icon,
  BuildingIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  DoorClosedIcon,
  DoorOpenIcon,
  MapPinIcon,
  PencilIcon,
  TrophyIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePageTitle } from "@/components/layout/page-title";
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
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { RowActions } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/use-current-user";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { Permission } from "@/lib/auth";
import { scorecardHref } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { PEUnitView } from "@/types/domain";
import { useGetPrincipalEmployerQuery, useGetUnitsQuery } from "../../api/principal-employers.api";
import { PrincipalEmployerFormDialog } from "./pe-form-dialog";
import { CloseUnitDialog, ReopenUnitDialog, UnitFormDialog } from "./unit-dialogs";

const unitStatusOptions = [
  { value: "open", label: "Operational" },
  { value: "closed", label: "Closed" },
];

export function PrincipalEmployerDetailPage({ peId }: { peId: string }) {
  const canManage = useCan(Permission.MASTERS_MANAGE);
  const canCloseUnits = useCan(Permission.UNITS_CLOSE);
  const { data: pe, isLoading: peLoading, error } = useGetPrincipalEmployerQuery(peId);
  usePageTitle(pe?.name);

  const table = useTableUrlState("code,asc");
  const [status, setStatus] = useUrlFilter("status", table.resetPage);
  const units = useGetUnitsQuery({
    ...table.request,
    peId,
    status: (status || undefined) as "open" | "closed" | undefined,
  });

  const [peFormOpen, setPeFormOpen] = useState(false);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<PEUnitView | null>(null);
  const [closing, setClosing] = useState<PEUnitView | null>(null);
  const [reopening, setReopening] = useState<PEUnitView | null>(null);

  if ((error as ApiError | undefined)?.status === 404) {
    return (
      <EmptyState
        icon={BuildingIcon}
        title="Principal Employer not found"
        description="It may have been removed, or the link is incorrect."
        action={
          <Button asChild variant="outline">
            <Link href="/masters/principal-employers">Back to Principal Employers</Link>
          </Button>
        }
      />
    );
  }

  const columns: DataTableColumn<PEUnitView>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <SortableHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.code}</span>,
      meta: { className: "w-36" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title="Unit" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "stateCode",
      header: ({ column }) => <SortableHeader column={column} title="State" />,
      meta: { className: "hidden w-24 sm:table-cell" },
    },
    {
      accessorKey: "activeVendorCount",
      header: ({ column }) => <SortableHeader column={column} title="Vendors" />,
      cell: ({ row }) => <span className="tabular">{row.original.activeVendorCount}</span>,
      meta: { className: "hidden w-28 md:table-cell" },
    },
    {
      accessorKey: "closedAt",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.closedAt ? (
          <StatusBadge tone="neutral" label={`Closed ${formatDate(row.original.closedAt)}`} />
        ) : (
          <StatusBadge tone="success" label="Operational" />
        ),
      meta: { className: "w-44" },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { className: "w-12 text-right" },
      cell: ({ row }) => (
        <RowActions
          label={`Actions for ${row.original.code}`}
          actions={[
            {
              label: "Edit",
              icon: PencilIcon,
              hidden: !canManage,
              onSelect: () => {
                setEditingUnit(row.original);
                setUnitFormOpen(true);
              },
            },
            {
              label: "Close unit",
              icon: DoorClosedIcon,
              destructive: true,
              separated: canManage,
              hidden: !canCloseUnits || !!row.original.closedAt,
              onSelect: () => setClosing(row.original),
            },
            {
              label: "Reopen unit",
              icon: DoorOpenIcon,
              separated: canManage,
              hidden: !canCloseUnits || !row.original.closedAt,
              onSelect: () => setReopening(row.original),
            },
          ]}
        />
      ),
    },
  ];

  const closedCount = pe ? pe.unitCount - pe.openUnitCount : 0;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/masters/principal-employers">
          <ArrowLeftIcon /> Principal Employers
        </Link>
      </Button>

      {peLoading || !pe ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      ) : (
        <PageHeader
          title={pe.name}
          badge={<ActiveBadge active={pe.isActive} />}
          description={pe.legalName}
          actions={
            <>
              <Button asChild variant="outline">
                <Link href={scorecardHref("PE", pe.id)}>
                  <TrophyIcon /> Scorecard
                </Link>
              </Button>
              {canManage && (
                <Button variant="outline" onClick={() => setPeFormOpen(true)}>
                  <PencilIcon /> Edit details
                </Button>
              )}
            </>
          }
        />
      )}

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <KpiCard label="Units" icon={<Building2Icon />} value={pe?.unitCount ?? "—"} />
        <KpiCard label="Operational" icon={<CircleCheckIcon />} value={pe?.openUnitCount ?? "—"} />
        <KpiCard label="Closed" icon={<CircleSlashIcon />} value={pe ? closedCount : "—"} />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="units-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="units-heading" className="text-sm font-semibold">
            Units
          </h2>
        </div>
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search units…"
          filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={unitStatusOptions} />}
          actions={
            canManage && (
              <Button
                onClick={() => {
                  setEditingUnit(null);
                  setUnitFormOpen(true);
                }}
              >
                <PlusIcon /> Add unit
              </Button>
            )
          }
        />
        <DataTable
          columns={columns}
          data={units.data?.content}
          getRowId={(u) => u.id}
          isLoading={units.isLoading}
          isFetching={units.isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          empty={
            <EmptyState
              icon={MapPinIcon}
              title={table.search || status ? "No units match your filters" : "No units yet"}
              description={
                !table.search && !status ? "Add the sites where this Principal Employer engages vendors." : undefined
              }
              className="rounded-none border-0"
            />
          }
        />
        {units.data && (
          <DataTablePagination
            page={table.page}
            size={table.size}
            totalElements={units.data.totalElements}
            totalPages={units.data.totalPages}
            onPageChange={table.setPage}
            onSizeChange={table.setSize}
            noun="units"
          />
        )}
      </section>

      {pe && <PrincipalEmployerFormDialog open={peFormOpen} onOpenChange={setPeFormOpen} principalEmployer={pe} />}
      <UnitFormDialog open={unitFormOpen} onOpenChange={setUnitFormOpen} peId={peId} unit={editingUnit} />
      <CloseUnitDialog unit={closing} onClose={() => setClosing(null)} />
      <ReopenUnitDialog unit={reopening} onClose={() => setReopening(null)} />
    </>
  );
}
