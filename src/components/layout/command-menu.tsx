"use client";

import { KeyRoundIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navigation } from "@/config/navigation";
import { can } from "@/lib/auth";
import type { SessionUser } from "@/types/domain";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SessionUser;
  onSignOut: () => void;
}

/** Ctrl/⌘ + K — jump to any page the user can access, switch theme, sign out. */
export function CommandMenu({ open, onOpenChange, user, onSignOut }: CommandMenuProps) {
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Jump to a page or run a command">
      <CommandInput placeholder="Search pages and commands…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {navigation.map((group, index) => {
          const items = group.items.filter((item) => can(user, item.permission));
          if (items.length === 0) return null;
          return (
            <CommandGroup key={group.label ?? index} heading={group.label ?? "Navigate"}>
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.keywords?.join(" ") ?? ""}`}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <item.icon aria-hidden />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
        <CommandSeparator />
        <CommandGroup heading="Preferences">
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <SunIcon aria-hidden /> Light theme
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <MoonIcon aria-hidden /> Dark theme
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("system"))}>
            <MonitorIcon aria-hidden /> System theme
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => run(() => router.push("/change-password"))}>
            <KeyRoundIcon aria-hidden /> Change password
          </CommandItem>
          <CommandItem onSelect={() => run(onSignOut)}>
            <LogOutIcon aria-hidden /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
