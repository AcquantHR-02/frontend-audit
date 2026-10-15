"use client";

import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { SessionUser } from "@/types/domain";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { UserMenu } from "./user-menu";

interface AppHeaderProps {
  user: SessionUser;
  onSignOut: () => void;
  /** Notification bell, injected by the app shell (layout can't import features). */
  notifications?: ReactNode;
}

export function AppHeader({ user, onSignOut, notifications }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
      <AppBreadcrumbs />

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {notifications}
        <UserMenu user={user} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
