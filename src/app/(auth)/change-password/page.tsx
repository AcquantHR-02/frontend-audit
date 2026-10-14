import type { Metadata } from "next";
import { AuthGuard, ChangePasswordForm } from "@/features/auth";

export const metadata: Metadata = { title: "Change password" };

export default function ChangePasswordPage() {
  return (
    <AuthGuard>
      <div className="mb-8 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-muted-foreground">
          For your security, choose a new password before continuing. You&apos;ll use it the next time you sign in.
        </p>
      </div>
      <ChangePasswordForm />
    </AuthGuard>
  );
}
