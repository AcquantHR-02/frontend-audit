"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarXIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  SortableHeader,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { RowActions } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetUnitsQuery, usePrincipalEmployerOptions, useVendorOptions } from "@/features/masters";
import { useCan } from "@/hooks/use-current-user";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { Permission } from "@/lib/auth";
import type { StatusMeta } from "@/lib/domain";
import { applyApiError, formatDate } from "@/lib/utils";
import type { AssignmentStatus, VendorUnitAssignmentView } from "@/types/domain";
import {
  useAssignVendorToUnitMutation,
  useEndVendorUnitAssignmentMutation,
  useGetVendorUnitAssignmentsQuery,
} from "../api/assignments.api";

const statusMeta: Record<AssignmentStatus, StatusMeta> = {
  CURRENT: { label: "Current", tone: "success" },
  FUTURE: { label: "Starts later", tone: "info" },
  ENDED: { label: "Ended", tone: "neutral" },
};
const statusOptions = (Object.keys(statusMeta) as AssignmentStatus[]).map((s) => ({
  value: s,
  label: statusMeta[s].label,
}));
const today = () => new Date().toISOString().slice(0, 10);

export function VendorUnitsPage() {
  const canEdit = useCan(Permission.ASSIGNMENTS_MANAGE);
  const vendorOptions = useVendorOptions();
  const table = useTableUrlState("vendorName,asc");
  const [vendorId, setVendorId] = useUrlFilter("vendor", table.resetPage);
  const [status, setStatus] = useUrlFilter("status", table.resetPage);
  const { data, isLoading, isFetching } = useGetVendorUnitAssignmentsQuery({
    ...table.request,
    vendorId: vendorId || undefined,
    status: (status || undefined) as AssignmentStatus | undefined,
  });
  const [assignOpen, setAssignOpen] = useState(false);
  const [ending, setEnding] = useState<VendorUnitAssignmentView | null>(null);

  const columns: DataTableColumn<VendorUnitAssignmentView>[] = [
    {
      accessorKey: "vendorName",
      header: ({ column }) => <SortableHeader column={column} title="Vendor" />,
      cell: ({ row }) => <span className="font-medium">{row.original.vendorName}</span>,
    },
    {
      accessorKey: "unitCode",
      header: ({ column }) => <SortableHeader column={column} title="Unit" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>
            <span className="font-mono text-xs">{row.original.unitCode}</span> · {row.original.unitName}
          </span>
          <span className="text-xs text-muted-foreground">{row.original.peName}</span>
        </div>
      ),
    },
    {
      accessorKey: "effectiveFrom",
      header: ({ column }) => <SortableHeader column={column} title="From" />,
      cell: ({ row }) => <span className="tabular">{formatDate(row.original.effectiveFrom)}</span>,
      meta: { className: "hidden w-32 sm:table-cell" },
    },
    {
      accessorKey: "effectiveTo",
      header: ({ column }) => <SortableHeader column={column} title="To" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular">
          {row.original.effectiveTo ? formatDate(row.original.effectiveTo) : "Open"}
        </span>
      ),
      meta: { className: "hidden w-32 md:table-cell" },
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge meta={statusMeta[row.original.status]} />,
      meta: { className: "w-32" },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { className: "w-12 text-right" },
      cell: ({ row }) => (
        <RowActions
          actions={[
            {
              label: "End assignment",
              icon: CalendarXIcon,
              destructive: true,
              hidden: !canEdit || !!row.original.effectiveTo,
              onSelect: () => setEnding(row.original),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Vendor units"
        description="Which units each vendor works at, and when. A vendor at 10 units is audited as 10 separate runs."
        actions={
          canEdit && (
            <Button onClick={() => setAssignOpen(true)}>
              <PlusIcon /> Assign vendor
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3">
        <DataTableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search vendor or unit…"
          filters={
            <>
              <FilterSelect label="Vendor" value={vendorId} onChange={setVendorId} options={vendorOptions} />
              <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
            </>
          }
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
            <EmptyState icon={MapPinIcon} title="No assignments match your filters" className="rounded-none border-0" />
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
            noun="assignments"
          />
        )}
      </div>
      <AssignVendorDialog open={assignOpen} onOpenChange={setAssignOpen} />
      <EndAssignmentDialog assignment={ending} onClose={() => setEnding(null)} />
    </>
  );
}

const assignSchema = z.object({
  vendorId: z.string().min(1, "Select a vendor"),
  peId: z.string().min(1, "Select a Principal Employer"),
  peUnitId: z.string().min(1, "Select a unit"),
  effectiveFrom: z.string().min(1, "Select the start date"),
});
type AssignValues = z.infer<typeof assignSchema>;

function AssignVendorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const vendorOptions = useVendorOptions();
  const peOptions = usePrincipalEmployerOptions();
  const [assign, { isLoading }] = useAssignVendorToUnitMutation();
  const form = useForm<AssignValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { vendorId: "", peId: "", peUnitId: "", effectiveFrom: today() },
  });
  const { errors } = form.formState;
  const peId = useWatch({ control: form.control, name: "peId" });
  const { data: units } = useGetUnitsQuery({ peId, status: "open", size: 200, sort: "code,asc" }, { skip: !peId });

  const close = (next: boolean) => {
    if (!next) form.reset();
    onOpenChange(next);
  };

  const select = (
    name: "vendorId" | "peId" | "peUnitId",
    placeholder: string,
    options: { value: string; label: string }[],
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Select
          value={field.value}
          onValueChange={(v) => {
            field.onChange(v);
            if (name === "peId") form.setValue("peUnitId", "");
          }}
        >
          <SelectTrigger id={`assign-${name}`} className="w-full" aria-invalid={!!errors[name]}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={close}
      title="Assign vendor to unit"
      description="Next, set up the vendor's checklist for this unit under Vendor checklists."
      submitLabel="Assign"
      isPending={isLoading}
      error={errors.root?.server?.message}
      onSubmit={form.handleSubmit(async ({ vendorId, peUnitId, effectiveFrom }) => {
        try {
          const created = await assign({ vendorId, peUnitId, effectiveFrom }).unwrap();
          toast.success("Vendor assigned", { description: `${created.vendorName} → ${created.unitCode}` });
          close(false);
        } catch (error) {
          applyApiError(error, form.setError, ["vendorId", "peUnitId", "effectiveFrom"]);
        }
      })}
    >
      <Field data-invalid={!!errors.vendorId}>
        <FieldLabel htmlFor="assign-vendorId">Vendor</FieldLabel>
        {select("vendorId", "Select a vendor", vendorOptions)}
        <FieldError errors={[errors.vendorId]} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.peId}>
          <FieldLabel htmlFor="assign-peId">Principal Employer</FieldLabel>
          {select("peId", "Select", peOptions)}
          <FieldError errors={[errors.peId]} />
        </Field>
        <Field data-invalid={!!errors.peUnitId}>
          <FieldLabel htmlFor="assign-peUnitId">Unit</FieldLabel>
          {select(
            "peUnitId",
            peId ? "Select a unit" : "Select a PE first",
            (units?.content ?? []).map((u) => ({ value: u.id, label: `${u.code} · ${u.name}` })),
          )}
          <FieldError errors={[errors.peUnitId]} />
        </Field>
      </div>
      <Field data-invalid={!!errors.effectiveFrom}>
        <FieldLabel htmlFor="assign-from">Works at this unit from</FieldLabel>
        <Input id="assign-from" type="date" className="w-44" {...form.register("effectiveFrom")} />
        <FieldError errors={[errors.effectiveFrom]} />
      </Field>
    </FormDialog>
  );
}

function EndAssignmentDialog({
  assignment,
  onClose,
}: {
  assignment: VendorUnitAssignmentView | null;
  onClose: () => void;
}) {
  const [endAssignment, { isLoading }] = useEndVendorUnitAssignmentMutation();
  const [effectiveTo, setEffectiveTo] = useState(today);
  const [error, setError] = useState<string>();

  return (
    <ConfirmDialog
      open={!!assignment}
      onOpenChange={(open) => {
        if (!open) {
          setError(undefined);
          onClose();
        }
      }}
      title="End assignment?"
      description={
        <p>
          <b className="text-foreground">{assignment?.vendorName}</b> stops working at{" "}
          <b className="text-foreground">{assignment?.unitCode}</b> after the end date. This can&apos;t be undone;
          assign again with a new start date if they return. Other units are not affected.
        </p>
      }
      confirmLabel="End assignment"
      destructive
      isPending={isLoading}
      onConfirm={async () => {
        if (!assignment) return;
        try {
          await endAssignment({ id: assignment.id, effectiveTo }).unwrap();
          toast.success("Assignment ended");
          onClose();
        } catch (e) {
          setError((e as { message?: string }).message);
        }
      }}
    >
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="end-date">Last working day</FieldLabel>
        <Input
          id="end-date"
          type="date"
          min={assignment?.effectiveFrom}
          value={effectiveTo}
          onChange={(e) => setEffectiveTo(e.target.value)}
          className="w-44"
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>
    </ConfirmDialog>
  );
}
