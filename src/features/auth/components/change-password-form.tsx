"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, CircleIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import { useChangePasswordMutation } from "../api/auth.api";
import { changePasswordSchema, passwordRules, type ChangePasswordValues } from "../schemas/auth.schema";

export function ChangePasswordForm() {
  const router = useRouter();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  const newPassword = useWatch({ control: form.control, name: "newPassword" });

  async function onSubmit({ currentPassword, newPassword }: ChangePasswordValues) {
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      toast.success("Password updated");
      router.replace("/overview");
    } catch (error) {
      const { message, fieldErrors } = error as ApiError;
      if (fieldErrors?.currentPassword) form.setError("currentPassword", { message: fieldErrors.currentPassword });
      else if (fieldErrors?.newPassword) form.setError("newPassword", { message: fieldErrors.newPassword });
      else form.setError("root", { message });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup className="gap-5">
        {errors.root && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-subtle px-3 py-2 text-danger">
            {errors.root.message}
          </p>
        )}

        <Field data-invalid={!!errors.currentPassword}>
          <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            autoFocus
            aria-invalid={!!errors.currentPassword}
            className="h-10"
            {...form.register("currentPassword")}
          />
          <FieldError errors={[errors.currentPassword]} />
        </Field>

        <Field data-invalid={!!errors.newPassword}>
          <FieldLabel htmlFor="newPassword">New password</FieldLabel>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            aria-describedby="password-rules"
            className="h-10"
            {...form.register("newPassword")}
          />
          <ul id="password-rules" className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {passwordRules.map((rule) => {
              const met = rule.test(newPassword);
              return (
                <li
                  key={rule.id}
                  className={cn("flex items-center gap-1.5", met ? "text-success" : "text-muted-foreground")}
                >
                  {met ? <CheckIcon className="size-3.5" aria-hidden /> : <CircleIcon className="size-3" aria-hidden />}
                  {rule.label}
                  <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                </li>
              );
            })}
          </ul>
          <FieldError errors={[errors.newPassword]} />
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            className="h-10"
            {...form.register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>

        <Button type="submit" size="lg" className="h-10 w-full" disabled={isLoading}>
          {isLoading && <Loader2Icon className="animate-spin" aria-hidden />}
          {isLoading ? "Updating…" : "Update password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
