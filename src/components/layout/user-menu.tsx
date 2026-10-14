"use client";

import { ChevronsUpDownIcon, KeyRoundIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { roleMeta } from "@/lib/domain";
import { initials } from "@/lib/utils";
import type { SessionUser } from "@/types/domain";

export function UserMenu({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const { theme = "system", setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-accent">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials(user.fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden min-w-0 flex-col leading-tight md:flex">
          <span className="truncate text-[13px] font-medium">{user.fullName}</span>
          <span className="truncate text-[11px] text-muted-foreground">{roleMeta[user.role].label}</span>
        </span>
        <ChevronsUpDownIcon className="hidden size-3.5 text-muted-foreground md:block" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1.5 py-2 font-normal">
          <span className="text-sm font-medium">{user.fullName}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          <StatusBadge meta={roleMeta[user.role]} className="w-fit" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <SunIcon aria-hidden /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon aria-hidden /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon aria-hidden /> System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/change-password">
              <KeyRoundIcon aria-hidden /> Change password
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
            <LogOutIcon aria-hidden /> Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
