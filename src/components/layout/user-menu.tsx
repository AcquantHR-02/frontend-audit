"use client";

import {
  ChevronsUpDownIcon,
  KeyRoundIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import type { ComponentProps } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siteConfig } from "@/config/site";
import { roleMeta } from "@/lib/domain";
import { cn, initials } from "@/lib/utils";
import type { SessionUser } from "@/types/domain";

interface UserMenuProps {
  user: SessionUser;
  onSignOut: () => void;
}

/** Brand-gradient initials avatar with an "online" dot. */
function UserAvatar({ user, className, dot = true }: { user: SessionUser; className?: string; dot?: boolean }) {
  return (
    <span className="relative shrink-0">
      <Avatar className={cn("size-8 ring-2 ring-background", className)}>
        <AvatarFallback className="bg-gradient-to-br from-primary to-brand-cyan text-xs font-semibold text-white">
          {initials(user.fullName)}
        </AvatarFallback>
      </Avatar>
      {dot && (
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-background"
        />
      )}
    </span>
  );
}

const themes: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

/** Shared menu body: identity card, theme switch, account actions. */
function ProfileMenuContent({
  user,
  onSignOut,
  ...props
}: UserMenuProps & Omit<ComponentProps<typeof DropdownMenuContent>, "children">) {
  const { theme = "system", setTheme } = useTheme();

  return (
    <DropdownMenuContent className="w-72 p-1.5" {...props}>
      <div className="relative mb-1.5 overflow-hidden rounded-lg bg-hero-gradient p-3 text-white">
        <div aria-hidden className="absolute -top-10 -right-8 size-28 rounded-full border-[14px] border-white/[0.07]" />
        <div className="relative flex items-center gap-3">
          <Avatar className="size-11 ring-2 ring-white/25">
            <AvatarFallback className="bg-white/15 text-sm font-semibold text-white">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-white/70">{user.email}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              {roleMeta[user.role].label}
            </span>
          </div>
        </div>
      </div>

      <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        Appearance
      </DropdownMenuLabel>
      <div role="radiogroup" aria-label="Theme" className="mx-1 mb-1.5 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            role="radio"
            aria-checked={theme === value}
            // Keep the menu open so the change is visible immediately.
            onSelect={(event) => {
              event.preventDefault();
              setTheme(value);
            }}
            className={cn(
              "flex-col gap-1 rounded-md py-1.5 text-[11px] font-medium text-muted-foreground",
              theme === value && "bg-card text-foreground shadow-xs focus:bg-card",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </DropdownMenuItem>
        ))}
      </div>

      <DropdownMenuSeparator />
      <DropdownMenuItem asChild className="gap-3 py-2">
        <Link href="/settings">
          <span className="grid size-8 place-items-center rounded-md bg-accent text-primary">
            <SettingsIcon aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="font-medium">Settings</span>
            <span className="text-xs text-muted-foreground">Profile and notifications</span>
          </span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="gap-3 py-2">
        <Link href="/change-password">
          <span className="grid size-8 place-items-center rounded-md bg-accent text-primary">
            <KeyRoundIcon aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="font-medium">Change password</span>
            <span className="text-xs text-muted-foreground">Update your sign-in password</span>
          </span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onSelect={onSignOut} className="gap-3 py-2">
        <span className="grid size-8 place-items-center rounded-md bg-danger-subtle text-danger">
          <LogOutIcon aria-hidden />
        </span>
        <span className="font-medium">Sign out</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <p className="px-2 py-1 text-[11px] text-muted-foreground">
        v{siteConfig.version} · {siteConfig.organisation}
      </p>
    </DropdownMenuContent>
  );
}

/** Header profile trigger. */
export function UserMenu({ user, onSignOut }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full border border-transparent p-0.5 text-left transition-colors outline-none hover:border-border hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:border-border data-[state=open]:bg-card md:rounded-xl md:py-1 md:pr-2.5 md:pl-1">
        <UserAvatar user={user} />
        <span className="hidden min-w-0 flex-col leading-tight md:flex">
          <span className="truncate text-[13px] font-medium">{user.fullName}</span>
          <span className="truncate text-[11px] text-muted-foreground">{roleMeta[user.role].label}</span>
        </span>
        <ChevronsUpDownIcon className="hidden size-3.5 text-muted-foreground md:block" aria-hidden />
      </DropdownMenuTrigger>
      <ProfileMenuContent user={user} onSignOut={onSignOut} align="end" sideOffset={8} />
    </DropdownMenu>
  );
}
