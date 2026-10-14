"use client";

import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { SessionUser } from "@/types/domain";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { CommandMenu } from "./command-menu";
import { NotificationsButton } from "./notifications-button";
import { UserMenu } from "./user-menu";

interface AppHeaderProps {
  user: SessionUser;
  onSignOut: () => void;
}

export function AppHeader({ user, onSignOut }: AppHeaderProps) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
      <AppBreadcrumbs />

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex h-8 items-center gap-2 rounded-md border bg-card px-2.5 text-[13px] text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-64"
          aria-label="Search"
        >
          <SearchIcon className="size-4" aria-hidden />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
        </button>
        <NotificationsButton />
        <UserMenu user={user} onSignOut={onSignOut} />
      </div>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} user={user} onSignOut={onSignOut} />
    </header>
  );
}
