"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangleIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyApiError, formatDate } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { PEUnitView } from "@/types/domain";
import {
  useCloseUnitMutation,
  useCreateUnitMutation,
  useReopenUnitMutation,
  useUpdateUnitMutation,
} from "../../api/principal-employers.api";
import { useStateOptions } from "../../hooks/use-master-options";
import { closeUnitSchema, unitSchema, type CloseUnitValues, type UnitValues } from "../../schemas/masters.schema";

const today = () => new Date().toISOString().slice(0, 10);

export function UnitFormDialog({
  open,
  onOpenChange,
  peId,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peId: string;
  unit?: PEUnitView | null;
}) {
  const isEdit = !!unit;
  const stateOptions = useStateOptions();
  const [createUnit, createState] = useCreateUnitMutation();
  const [updateUnit, updateState] = useUpdateUnitMutation();
  const form = useForm<UnitValues>({
    resolver: zodResolver(unitSchema),
    values: { code: unit?.code ?? "", name: unit?.name ?? "", stateId: unit?.stateId ?? "" },
  });
  const { errors } = form.formState;

  async function onSubmit(values: UnitValues) {
    try {
      if (isEdit) await updateUnit({ id: unit.id, peId, ...values }).unwrap();
      else await createUnit({ peId, ...values }).unwrap();
      toast.success(isEdit ? "Unit updated" : "Unit added", { description: `${values.code} · ${values.name}` });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError, ["code", "name", "stateId"]);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
      title={isEdit ? "Edit unit" : "Add unit"}
      description="A unit is a physical site of the Principal Employer, located in one state."
      submitLabel={isEdit ? "Save changes" : "Add unit"}
      isPending={createState.isLoading || updateState.isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      error={errors.root?.server?.message}
    >
      <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)]">
        <Field data-invalid={!!errors.code}>
          <FieldLabel htmlFor="unit-code">Unit code</FieldLabel>
          <Input
            id="unit-code"
            autoFocus
            placeholder="VOM-JIG"
            className="font-mono uppercase"
            aria-invalid={!!errors.code}
            {...form.register("code")}
          />
          <FieldError errors={[errors.code]} />
        </Field>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="unit-name">Unit name</FieldLabel>
          <Input id="unit-name" placeholder="Jigani" aria-invalid={!!errors.name} {...form.register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
      </div>
      <Field data-invalid={!!errors.stateId}>
        <FieldLabel htmlFor="unit-state">State</FieldLabel>
        <Controller
          control={form.control}
          name="stateId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="unit-state" className="w-full" aria-invalid={!!errors.stateId}>
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.stateId]} />
      </Field>
    </FormDialog>
  );
}

/** §13 — closure is informational and ends active vendor assignments (one-way). */
export function CloseUnitDialog({ unit, onClose }: { unit: PEUnitView | null; onClose: () => void }) {
  const [closeUnit, { isLoading }] = useCloseUnitMutation();
  const form = useForm<CloseUnitValues>({ resolver: zodResolver(closeUnitSchema), values: { closedOn: today() } });
  const { errors } = form.formState;

  return (
    <ConfirmDialog
      open={!!unit}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
          onClose();
        }
      }}
      title={`Close unit ${unit?.code ?? ""}?`}
      description={
        <p>
          Marks <b className="text-foreground">{unit?.name}</b> as closed. Audits continue to cover activity up to the
          closure date; no new audit runs can extend past it.
        </p>
      }
      confirmLabel="Close unit"
      destructive
      isPending={isLoading}
      onConfirm={form.handleSubmit(async ({ closedOn }) => {
        if (!unit) return;
        try {
          const { endedAssignments } = await closeUnit({ id: unit.id, closedOn }).unwrap();
          toast.success(`Unit ${unit.code} closed`, {
            description: `${endedAssignments} vendor assignment${endedAssignments === 1 ? "" : "s"} ended on ${formatDate(closedOn)}.`,
          });
          form.reset();
          onClose();
        } catch (error) {
          applyApiError(error, form.setError, ["closedOn"]);
        }
      })}
    >
      <div className="space-y-4">
        <Field data-invalid={!!errors.closedOn}>
          <FieldLabel htmlFor="closed-on">Closure date</FieldLabel>
          <Input id="closed-on" type="date" max={today()} className="w-44" {...form.register("closedOn")} />
          <FieldError errors={[errors.closedOn, errors.root?.server]} />
        </Field>
        <Alert className="border-warning-border bg-warning-subtle text-warning">
          <AlertTriangleIcon />
          <AlertDescription className="text-warning">
            {unit?.activeVendorCount
              ? `${unit.activeVendorCount} active vendor assignment${unit.activeVendorCount === 1 ? "" : "s"} will end on this date. `
              : "No vendors are currently assigned. "}
            Reopening the unit later will not restore vendor assignments. In-flight audit runs are not interrupted.
          </AlertDescription>
        </Alert>
      </div>
    </ConfirmDialog>
  );
}

export function ReopenUnitDialog({ unit, onClose }: { unit: PEUnitView | null; onClose: () => void }) {
  const [reopenUnit, { isLoading }] = useReopenUnitMutation();
  return (
    <ConfirmDialog
      open={!!unit}
      onOpenChange={(open) => !open && onClose()}
      title={`Reopen unit ${unit?.code ?? ""}?`}
      description={
        <p>
          <b className="text-foreground">{unit?.name}</b> becomes operational again. Vendors that were assigned before
          the closure are <b className="text-foreground">not</b> re-assigned automatically. Assign them again with a
          fresh start date.
        </p>
      }
      confirmLabel="Reopen unit"
      isPending={isLoading}
      onConfirm={async () => {
        if (!unit) return;
        try {
          await reopenUnit(unit.id).unwrap();
          toast.success(`Unit ${unit.code} reopened`);
          onClose();
        } catch (error) {
          toast.error((error as ApiError).message);
        }
      }}
    />
  );
}
