import type { Metadata } from "next";
import { Suspense } from "react";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { GuestGuard, LoginForm } from "@/features/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    // useSearchParams (?next=) is request data → must sit behind a Suspense boundary.
    <Suspense fallback={<FullPageLoader />}>
      <GuestGuard>
        <div className="mb-8 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground">
            Use your work email. Your workspace depends on the role on your account.
          </p>
        </div>
        <LoginForm />
      </GuestGuard>
    </Suspense>
  );
}
