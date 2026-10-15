"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageTitleProvider } from "@/components/layout/page-title";
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
    <PageTitleProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset className="min-w-0">
          <AppHeader user={user} onSignOut={signOut} />
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 sm:p-6">
            {/* Pages read URL state (search params) → Suspense boundary required by Cache Components. */}
            <Suspense>
              {/* Re-keyed per route: a short fade-in on navigation (filters/search don't change the path). */}
              <div
                key={pathname}
                className="flex flex-1 animate-in flex-col gap-6 duration-300 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
              >
                {allowed ? children : <Forbidden />}
              </div>
            </Suspense>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PageTitleProvider>
  );
}
