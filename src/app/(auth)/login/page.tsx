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
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">Sign in with your work email to continue.</p>
        </div>
        <LoginForm />
      </GuestGuard>
    </Suspense>
  );
}
