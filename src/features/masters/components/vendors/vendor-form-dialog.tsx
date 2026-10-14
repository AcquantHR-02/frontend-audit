"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/utils";
import type { VendorSummary } from "@/types/domain";
import { useCreateVendorMutation, useUpdateVendorMutation } from "../../api/vendors.api";
import { vendorSchema, type VendorValues } from "../../schemas/masters.schema";

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode. */
  vendor?: VendorSummary | null;
}

export function VendorFormDialog({ open, onOpenChange, vendor }: VendorFormDialogProps) {
  const isEdit = !!vendor;
  const [createVendor, createState] = useCreateVendorMutation();
  const [updateVendor, updateState] = useUpdateVendorMutation();

  const form = useForm<VendorValues>({
    resolver: zodResolver(vendorSchema),
    values: { name: vendor?.name ?? "" },
  });
  const { errors } = form.formState;

  async function onSubmit(values: VendorValues) {
    try {
      if (isEdit) await updateVendor({ id: vendor.id, ...values }).unwrap();
      else await createVendor(values).unwrap();
      toast.success(isEdit ? "Vendor updated" : "Vendor added", { description: values.name });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError, ["name"]);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
      title={isEdit ? "Edit vendor" : "Add vendor"}
      description="Vendors are linked to Principal Employer units through assignments."
      submitLabel={isEdit ? "Save changes" : "Add vendor"}
      isPending={createState.isLoading || updateState.isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      error={errors.root?.server?.message}
    >
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="vendor-name">Vendor name</FieldLabel>
        <Input id="vendor-name" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
        <FieldError errors={[errors.name]} />
      </Field>
    </FormDialog>
  );
}
