"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangleIcon, Loader2Icon, LockIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { PasswordInput } from "@/components/shared/password-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { env } from "@/config/env";
import type { ApiError } from "@/types/api";
import { useLoginMutation } from "../api/auth.api";
import { loginSchema, safeRedirect, type LoginValues } from "../schemas/auth.schema";
import { DemoAccounts } from "./demo-accounts";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, { error, isLoading, reset }] = useLoginMutation();
  const apiError = error as ApiError | undefined;
  const isLocked = apiError?.code === "ACCOUNT_LOCKED";

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  async function onSubmit(values: LoginValues) {
    try {
      const { user } = await login(values).unwrap();
      router.replace(user.mustChangePassword ? "/change-password" : safeRedirect(searchParams.get("next")));
    } catch {
      form.setFocus("password");
    }
  }

  function fillDemo(email: string, password: string) {
    reset();
    form.reset({ email, password });
  }

  return (
    <div className="flex flex-col gap-5">
      {apiError && (
        <Alert variant="destructive" role="alert">
          {isLocked ? <LockIcon /> : <AlertTriangleIcon />}
          <AlertTitle>{isLocked ? "Account locked" : "Couldn't sign you in"}</AlertTitle>
          <AlertDescription>{apiError.message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="name@company.com"
              autoFocus
              aria-invalid={!!errors.email}
              className="h-10"
              {...form.register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className="h-10"
              {...form.register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <Button type="submit" size="lg" className="h-10 w-full" disabled={isLoading}>
            {isLoading && <Loader2Icon className="animate-spin" aria-hidden />}
            {isLoading ? "Signing in…" : "Sign in"}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Forgot your password or need access? Contact your Auditor Admin.
      </p>

      {env.isMockingEnabled && <DemoAccounts onSelect={fillDemo} />}
    </div>
  );
}
