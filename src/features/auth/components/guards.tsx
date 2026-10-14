"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FullPageLoader } from "@/components/shared/full-page-loader";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSessionStatus } from "../hooks/use-session-status";
import { safeRedirect } from "../schemas/auth.schema";

/**
 * Protects signed-in areas: restores the session, sends anonymous users to /login?next=…,
 * and forces a password change when the account requires it (§18).
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const status = useSessionStatus();
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const mustChange = !!user?.mustChangePassword && pathname !== "/change-password";

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (mustChange) router.replace("/change-password");
  }, [status, mustChange, pathname, router]);

  if (status !== "authenticated" || mustChange) return <FullPageLoader label="Checking your session…" />;
  return children;
}

/** For /login: an already signed-in user goes straight to where they were heading. */
export function GuestGuard({ children }: { children: ReactNode }) {
  const status = useSessionStatus();
  const user = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(user?.mustChangePassword ? "/change-password" : safeRedirect(searchParams.get("next")));
    }
  }, [status, user, router, searchParams]);

  if (status !== "anonymous") return <FullPageLoader />;
  return children;
}
