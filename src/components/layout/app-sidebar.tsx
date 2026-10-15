"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { findNavItem, navigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { can } from "@/lib/auth";
import type { SessionUser } from "@/types/domain";
import { Brand } from "./brand";

/** Primary navigation (navy in light, slate in dark); items filtered by the user's permissions. */
export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const activeHref = findNavItem(pathname)?.item.href;
  const { isMobile, setOpenMobile, state } = useSidebar();

  const groups = navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => can(user, item.permission)) }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r-0 dark:border-r dark:border-sidebar-border">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-3">
        <Link
          href="/overview"
          aria-label={`${siteConfig.name} home`}
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Brand inverted compact={state === "collapsed" && !isMobile} />
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2">
        {groups.map((group, index) => (
          <SidebarGroup key={group.label ?? index} className="py-1.5">
            {group.label && (
              <SidebarGroupLabel className="text-[10.5px] font-semibold tracking-wider text-sidebar-foreground/55 uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.href === activeHref}
                      tooltip={item.title}
                      className="h-9 text-[13px] text-sidebar-foreground/85 data-active:text-white data-active:shadow-[inset_2px_0_0_var(--sidebar-primary)] dark:data-active:bg-primary/15 [&>svg]:text-sidebar-foreground/60 data-active:[&>svg]:text-sidebar-primary"
                    >
                      <Link href={item.href} onClick={() => isMobile && setOpenMobile(false)}>
                        <item.icon aria-hidden />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
        v{siteConfig.version} · {siteConfig.organisation}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
