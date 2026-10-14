"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError, cn } from "@/lib/utils";
import type { Cadence, ChecklistItemView } from "@/types/domain";
import {
  useCreateChecklistItemMutation,
  useUpdateChecklistItemMutation,
  type ChecklistKind,
} from "../../api/checklist-items.api";
import { useActOptions, useStateOptions } from "../../hooks/use-master-options";
import { checklistItemSchema, type ChecklistItemValues } from "../../schemas/masters.schema";

const NATIONAL = "NATIONAL";

/** §8 — what each cadence means for audit runs. */
const cadenceHelp: Record<Cadence, { title: string; text: string }> = {
  LIFETIME: {
    title: "Lifetime",
    text: "Perpetual registration. One item per run; carries forward once complied.",
  },
  ONE_TIME: {
    title: "One-time (renewable)",
    text: "Registration with an expiry. Carries forward while still valid.",
  },
  PERIODIC: {
    title: "Periodic",
    text: "Returns, remittances, registers, event-driven items. The auditor adds one item per period.",
  },
};

export function ChecklistItemFormDialog({
  kind,
  open,
  onOpenChange,
  item,
}: {
  kind: ChecklistKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ChecklistItemView | null;
}) {
  const isEdit = !!item;
  const actOptions = useActOptions();
  const stateOptions = useStateOptions();
  const [createItem, createState] = useCreateChecklistItemMutation();
  const [updateItem, updateState] = useUpdateChecklistItemMutation();

  const form = useForm<ChecklistItemValues>({
    resolver: zodResolver(checklistItemSchema),
    values: {
      actId: item?.actId ?? "",
      scope: item ? (item.stateId ?? NATIONAL) : "",
      cadence: item?.cadence ?? ("" as Cadence),
      description: item?.description ?? "",
    },
  });
  const { errors } = form.formState;

  async function onSubmit({ scope, ...values }: ChecklistItemValues) {
    const body = { ...values, stateId: scope === NATIONAL ? null : scope };
    try {
      if (isEdit) await updateItem({ kind, id: item.id, body }).unwrap();
      else await createItem({ kind, body }).unwrap();
      toast.success(isEdit ? "Checklist item updated" : "Checklist item added");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError, ["actId", "cadence", "description"]);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
      title={isEdit ? "Edit checklist item" : "Add checklist item"}
      description={
        kind === "vendor" ? "Requirement on the vendor checklist master." : "Requirement on the PE checklist master."
      }
      submitLabel={isEdit ? "Save changes" : "Add item"}
      isPending={createState.isLoading || updateState.isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      error={errors.root?.server?.message}
      className="sm:max-w-xl"
    >
      {isEdit && (
        <Alert className="border-info-border bg-info-subtle text-info">
          <InfoIcon />
          <AlertDescription className="text-info">
            Changes apply to future audit runs only. Existing runs keep the description and cadence they were created
            with.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={!!errors.actId}>
          <FieldLabel htmlFor="ci-act">Act</FieldLabel>
          <Controller
            control={form.control}
            name="actId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ci-act" className="w-full" aria-invalid={!!errors.actId}>
                  <SelectValue placeholder="Select an Act" />
                </SelectTrigger>
                <SelectContent>
                  {actOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.actId]} />
        </Field>

        <Field data-invalid={!!errors.scope}>
          <FieldLabel htmlFor="ci-scope">Applies in</FieldLabel>
          <Controller
            control={form.control}
            name="scope"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ci-scope" className="w-full" aria-invalid={!!errors.scope}>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NATIONAL}>National (all states)</SelectItem>
                  <SelectSeparator />
                  {stateOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.scope]} />
        </Field>
      </div>

      <FieldSet data-invalid={!!errors.cadence}>
        <FieldLegend variant="label">Cadence</FieldLegend>
        <Controller
          control={form.control}
          name="cadence"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(cadenceHelp) as Cadence[]).map((cadence) => (
                <label
                  key={cadence}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors hover:bg-accent/50",
                    field.value === cadence && "border-primary bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2 text-[13px] font-medium">
                    <RadioGroupItem value={cadence} aria-label={cadenceHelp[cadence].title} />
                    {cadenceHelp[cadence].title}
                  </span>
                  <span className="text-xs text-muted-foreground">{cadenceHelp[cadence].text}</span>
                </label>
              ))}
            </RadioGroup>
          )}
        />
        <FieldError errors={[errors.cadence]} />
      </FieldSet>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="ci-description">Requirement</FieldLabel>
        <Textarea
          id="ci-description"
          rows={3}
          placeholder="e.g. Monthly ESIC contribution challan paid by due date"
          aria-invalid={!!errors.description}
          {...form.register("description")}
        />
        <FieldDescription>Describe what must be true. Evidence is uploaded per audit run.</FieldDescription>
        <FieldError errors={[errors.description]} />
      </Field>
    </FormDialog>
  );
}
