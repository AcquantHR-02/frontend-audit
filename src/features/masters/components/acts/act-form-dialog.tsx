"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/utils";
import type { ActSummary } from "@/types/domain";
import { useCreateActMutation, useUpdateActMutation } from "../../api/acts.api";
import { actSchema, type ActValues } from "../../schemas/masters.schema";

export function ActFormDialog({
  open,
  onOpenChange,
  act,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  act?: ActSummary | null;
}) {
  const isEdit = !!act;
  const [createAct, createState] = useCreateActMutation();
  const [updateAct, updateState] = useUpdateActMutation();

  const form = useForm<ActValues>({
    resolver: zodResolver(actSchema),
    values: { shortName: act?.shortName ?? "", name: act?.name ?? "", category: act?.category ?? "" },
  });
  const { errors } = form.formState;

  async function onSubmit(values: ActValues) {
    const body = { ...values, category: values.category || null };
    try {
      if (isEdit) await updateAct({ id: act.id, ...body }).unwrap();
      else await createAct(body).unwrap();
      toast.success(isEdit ? "Act updated" : "Act added", { description: values.shortName });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError, ["shortName", "name", "category"]);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
      title={isEdit ? "Edit Act" : "Add Act"}
      description="Acts group checklist requirements on both the vendor and PE masters."
      submitLabel={isEdit ? "Save changes" : "Add Act"}
      isPending={createState.isLoading || updateState.isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      error={errors.root?.server?.message}
    >
      <Field data-invalid={!!errors.shortName}>
        <FieldLabel htmlFor="act-short">Short name</FieldLabel>
        <Input
          id="act-short"
          autoFocus
          placeholder="CLRA"
          aria-invalid={!!errors.shortName}
          {...form.register("shortName")}
        />
        <FieldDescription>Shown on checklist rows and reports.</FieldDescription>
        <FieldError errors={[errors.shortName]} />
      </Field>
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="act-name">Full name</FieldLabel>
        <Input
          id="act-name"
          placeholder="Contract Labour (Regulation & Abolition) Act, 1970"
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
        <FieldError errors={[errors.name]} />
      </Field>
      <Field data-invalid={!!errors.category}>
        <FieldLabel htmlFor="act-category">
          Category <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Input id="act-category" placeholder="Social Security" {...form.register("category")} />
        <FieldError errors={[errors.category]} />
      </Field>
    </FormDialog>
  );
}
