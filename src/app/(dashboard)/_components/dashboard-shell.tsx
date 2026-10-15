"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Forbidden } from "@/components/shared/forbidden";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { findNavItem } from "@/config/navigation";
import { AuthGuard, useLogoutMutation } from "@/features/auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { can } from "@/lib/auth";

/** Protected app chrome: auth guard → sidebar + header → route-level permission check → page. */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ShellContent>{children}</ShellContent>
    </AuthGuard>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const user = useCurrentUser()!; // guaranteed by AuthGuard
  const pathname = usePathname();
  const router = useRouter();
  const [logout] = useLogoutMutation();

  // Hiding a nav item is not security: a typed URL must be blocked too.
  const route = findNavItem(pathname);
  const allowed = !route || can(user, route.item.permission);

  async function signOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} onSignOut={signOut} />
      <SidebarInset className="min-w-0">
        <AppHeader user={user} onSignOut={signOut} />
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 sm:p-6">
          {/* Pages read URL state (search params) → Suspense boundary required by Cache Components. */}
          <Suspense>{allowed ? children : <Forbidden />}</Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
