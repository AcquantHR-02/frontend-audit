"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/shared/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrincipalEmployerOptions, useVendorOptions } from "@/features/masters";
import { roleMeta } from "@/lib/domain";
import { applyApiError } from "@/lib/utils";
import type { Role, UserView } from "@/types/domain";
import { useCreateUserMutation, useUpdateUserMutation, type UserWithPassword } from "../api/users.api";
import { userSchema, type UserValues } from "../schemas/user.schema";

const roleDescriptions: Record<Role, string> = {
  AUDITOR_ADMIN: "Full access, including master data and user management.",
  AUDITOR_USER: "Runs audits end to end on existing masters.",
  VENDOR_USER: "Uploads evidence and remediation for one vendor.",
  PE_USER: "Uploads evidence for its own PE audits; reads vendor audits at its units.",
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserView | null;
  onCreated: (result: UserWithPassword) => void;
}) {
  const isEdit = !!user;
  const vendorOptions = useVendorOptions();
  const peOptions = usePrincipalEmployerOptions();
  const [createUser, createState] = useCreateUserMutation();
  const [updateUser, updateState] = useUpdateUserMutation();

  const form = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    values: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      role: user?.role ?? ("" as Role),
      vendorId: user?.vendorId ?? "",
      peId: user?.peId ?? "",
    },
  });
  const { errors } = form.formState;
  const role = useWatch({ control: form.control, name: "role" });

  async function onSubmit(values: UserValues) {
    const body = {
      ...values,
      vendorId: values.role === "VENDOR_USER" ? values.vendorId : null,
      peId: values.role === "PE_USER" ? values.peId : null,
    };
    try {
      if (isEdit) {
        await updateUser({ id: user.id, ...body }).unwrap();
        toast.success("User updated", { description: values.fullName });
      } else {
        onCreated(await createUser(body).unwrap());
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError, ["fullName", "email", "role", "vendorId", "peId"]);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
      title={isEdit ? "Edit user" : "Add user"}
      description={isEdit ? undefined : "The user receives a temporary password and must change it on first sign-in."}
      submitLabel={isEdit ? "Save changes" : "Create user"}
      isPending={createState.isLoading || updateState.isLoading}
      onSubmit={form.handleSubmit(onSubmit)}
      error={errors.root?.server?.message}
    >
      <Field data-invalid={!!errors.fullName}>
        <FieldLabel htmlFor="user-name">Full name</FieldLabel>
        <Input id="user-name" autoFocus aria-invalid={!!errors.fullName} {...form.register("fullName")} />
        <FieldError errors={[errors.fullName]} />
      </Field>
      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="user-email">Work email</FieldLabel>
        <Input id="user-email" type="email" aria-invalid={!!errors.email} {...form.register("email")} />
        <FieldError errors={[errors.email]} />
      </Field>
      <Field data-invalid={!!errors.role}>
        <FieldLabel htmlFor="user-role">Role</FieldLabel>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="user-role" className="w-full" aria-invalid={!!errors.role}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(roleMeta) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleMeta[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {role && <FieldDescription>{roleDescriptions[role]}</FieldDescription>}
        <FieldError errors={[errors.role]} />
      </Field>

      {role === "VENDOR_USER" && (
        <Field data-invalid={!!errors.vendorId}>
          <FieldLabel htmlFor="user-vendor">Vendor</FieldLabel>
          <Controller
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="user-vendor" className="w-full" aria-invalid={!!errors.vendorId}>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>The user sees all units and periods of this vendor only.</FieldDescription>
          <FieldError errors={[errors.vendorId]} />
        </Field>
      )}

      {role === "PE_USER" && (
        <Field data-invalid={!!errors.peId}>
          <FieldLabel htmlFor="user-pe">Principal Employer</FieldLabel>
          <Controller
            control={form.control}
            name="peId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="user-pe" className="w-full" aria-invalid={!!errors.peId}>
                  <SelectValue placeholder="Select a Principal Employer" />
                </SelectTrigger>
                <SelectContent>
                  {peOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>The user sees all units, vendors and audits of this Principal Employer.</FieldDescription>
          <FieldError errors={[errors.peId]} />
        </Field>
      )}
    </FormDialog>
  );
}
