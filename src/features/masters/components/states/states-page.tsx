"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPinIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  SortableHeader,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FormDialog } from "@/components/shared/form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCan } from "@/hooks/use-current-user";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { Permission } from "@/lib/auth";
import { applyApiError, formatDate } from "@/lib/utils";
import type { State } from "@/types/domain";
import { useCreateStateMutation, useGetStatesQuery, useUpdateStateMutation } from "../../api/states.api";
import { stateSchema, type StateValues } from "../../schemas/masters.schema";

export function StatesPage() {
  const canManage = useCan(Permission.MASTERS_MANAGE);
  const table = useTableUrlState("name,asc");
  const { data, isLoading, isFetching } = useGetStatesQuery(table.request);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<State | null>(null);

  const columns: DataTableColumn<State>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <SortableHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.code}</span>,
      meta: { className: "w-28" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title="State" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title="Last updated" />,
      cell: ({ row }) => <span className="text-muted-foreground tabular">{formatDate(row.original.updatedAt)}</span>,
      meta: { className: "w-40" },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { className: "w-14 text-right" },
      cell: ({ row }) =>
        canManage ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${row.original.name}`}
            onClick={() => {
              setEditing(row.original);
              setFormOpen(true);
            }}
          >
            <PencilIcon />
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="States"
        description="Scope PE units and state-specific checklist items. Items without a state apply nationally."
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <PlusIcon /> Add state
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-3">
        <DataTableToolbar search={table.search} onSearchChange={table.setSearch} searchPlaceholder="Search states…" />
        <DataTable
          columns={columns}
          data={data?.content}
          getRowId={(s) => s.id}
          isLoading={isLoading}
          isFetching={isFetching}
          sort={table.sort}
          onSortChange={table.setSort}
          skeletonRows={4}
          empty={<EmptyState icon={MapPinIcon} title="No states found" className="rounded-none border-0" />}
        />
        {data && (
          <DataTablePagination
            page={table.page}
            size={table.size}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPageChange={table.setPage}
            onSizeChange={table.setSize}
            noun="states"
          />
        )}
      </div>
      <StateFormDialog open={formOpen} onOpenChange={setFormOpen} state={editing} />
    </>
  );
}

function StateFormDialog({
  open,
  onOpenChange,
  state,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: State | null;
}) {
  const isEdit = !!state;
  const [createState, createStatus] = useCreateStateMutation();
  const [updateState, updateStatus] = useUpdateStateMutation();
  const form = useForm<StateValues>({
    resolver: zodResolver(stateSchema),
    values: { code: state?.code ?? "", name: state?.name ?? "" },
  });
  const { errors } = form.formState;

  async function onSubmit(values: StateValues) {
    try {
      if (isEdit) await updateState({ id: state.id, ...values }).unwrap();
      else await createState(values).unwrap();
      toast.success(isEdit ? "State updated" : "State added", { description: values.name });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError, ["code", "name"]);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
      title={isEdit ? "Edit state" : "Add state"}
      submitLabel={isEdit ? "Save changes" : "Add state"}
      isPending={createStatus.isLoading || updateStatus.isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      error={errors.root?.server?.message}
      className="sm:max-w-md"
    >
      <Field data-invalid={!!errors.code}>
        <FieldLabel htmlFor="state-code">State code</FieldLabel>
        <Input
          id="state-code"
          autoFocus
          placeholder="KA"
          className="w-28 font-mono uppercase"
          aria-invalid={!!errors.code}
          {...form.register("code")}
        />
        <FieldError errors={[errors.code]} />
      </Field>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="state-name">State name</FieldLabel>
        <Input id="state-name" placeholder="Karnataka" aria-invalid={!!errors.name} {...form.register("name")} />
        <FieldError errors={[errors.name]} />
      </Field>
    </FormDialog>
  );
}
