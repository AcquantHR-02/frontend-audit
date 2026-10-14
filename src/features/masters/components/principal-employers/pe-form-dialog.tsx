"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/utils";
import type { PrincipalEmployerSummary } from "@/types/domain";
import {
  useCreatePrincipalEmployerMutation,
  useUpdatePrincipalEmployerMutation,
} from "../../api/principal-employers.api";
import { principalEmployerSchema, type PrincipalEmployerValues } from "../../schemas/masters.schema";

export function PrincipalEmployerFormDialog({
  open,
  onOpenChange,
  principalEmployer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  principalEmployer?: PrincipalEmployerSummary | null;
  onCreated?: (pe: PrincipalEmployerSummary) => void;
}) {
  const isEdit = !!principalEmployer;
  const [create, createState] = useCreatePrincipalEmployerMutation();
  const [update, updateState] = useUpdatePrincipalEmployerMutation();
  const form = useForm<PrincipalEmployerValues>({
    resolver: zodResolver(principalEmployerSchema),
    values: { name: principalEmployer?.name ?? "", legalName: principalEmployer?.legalName ?? "" },
  });
  const { errors } = form.formState;

  async function onSubmit(values: PrincipalEmployerValues) {
    try {
      if (isEdit) {
        await update({ id: principalEmployer.id, ...values }).unwrap();
        toast.success("Principal Employer updated", { description: values.name });
      } else {
        const created = await create(values).unwrap();
        toast.success("Principal Employer added", { description: "Next, add its units." });
        onCreated?.(created);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError, ["name", "legalName"]);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
      title={isEdit ? "Edit Principal Employer" : "Add Principal Employer"}
      description="The company engaging contractors. Units are added on its detail page."
      submitLabel={isEdit ? "Save changes" : "Add Principal Employer"}
      isPending={createState.isLoading || updateState.isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      error={errors.root?.server?.message}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="pe-name">Display name</FieldLabel>
        <Input
          id="pe-name"
          autoFocus
          placeholder="Veero Metals"
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
        <FieldDescription>Short name used across screens and reports.</FieldDescription>
        <FieldError errors={[errors.name]} />
      </Field>
      <Field data-invalid={!!errors.legalName}>
        <FieldLabel htmlFor="pe-legal">Legal name</FieldLabel>
        <Input
          id="pe-legal"
          placeholder="Veero O Metals Private Limited"
          aria-invalid={!!errors.legalName}
          {...form.register("legalName")}
        />
        <FieldError errors={[errors.legalName]} />
      </Field>
    </FormDialog>
  );
}
