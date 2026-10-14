import {
  BookOpenCheckIcon,
  BuildingIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  FileBarChart2Icon,
  HistoryIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MapPinIcon,
  ScaleIcon,
  ShieldAlertIcon,
  TimerResetIcon,
  TruckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Permission } from "@/lib/auth";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Required to see the item AND to open the route (enforced in the dashboard layout). */
  permission: Permission;
  /** Extra search terms for the command menu. */
  keywords?: string[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
 * Single source of truth for sidebar, breadcrumbs, command menu and route guarding.
 * Items are filtered per user by permission — never by role.
 */
export const navigation: NavGroup[] = [
  {
    items: [
      { title: "Overview", href: "/overview", icon: LayoutDashboardIcon, permission: Permission.DASHBOARD_VIEW },
      {
        title: "Audit runs",
        href: "/audit-runs",
        icon: ClipboardCheckIcon,
        permission: Permission.AUDIT_RUNS_VIEW,
        keywords: ["audit", "run", "air", "evidence", "review"],
      },
      {
        title: "Findings",
        href: "/findings",
        icon: ShieldAlertIcon,
        permission: Permission.FINDINGS_VIEW,
        keywords: ["non compliance", "nc", "remediation"],
      },
      {
        title: "Reports",
        href: "/reports",
        icon: FileBarChart2Icon,
        permission: Permission.REPORTS_VIEW,
        keywords: ["score", "export", "excel"],
      },
    ],
  },
  {
    label: "Assignments",
    items: [
      {
        title: "Vendor units",
        href: "/assignments/vendor-units",
        icon: MapPinIcon,
        permission: Permission.ASSIGNMENTS_MANAGE,
      },
      {
        title: "Vendor checklists",
        href: "/assignments/vendor-checklists",
        icon: ListChecksIcon,
        permission: Permission.ASSIGNMENTS_MANAGE,
      },
      {
        title: "PE checklists",
        href: "/assignments/pe-checklists",
        icon: ClipboardListIcon,
        permission: Permission.ASSIGNMENTS_MANAGE,
      },
    ],
  },
  {
    label: "Masters",
    items: [
      {
        title: "Principal employers",
        href: "/masters/principal-employers",
        icon: BuildingIcon,
        permission: Permission.MASTERS_VIEW,
        keywords: ["pe", "unit", "client"],
      },
      {
        title: "Vendors",
        href: "/masters/vendors",
        icon: TruckIcon,
        permission: Permission.MASTERS_VIEW,
        keywords: ["contractor"],
      },
      { title: "Acts", href: "/masters/acts", icon: ScaleIcon, permission: Permission.MASTERS_VIEW },
      {
        title: "Vendor checklist master",
        href: "/masters/checklists/vendor",
        icon: BookOpenCheckIcon,
        permission: Permission.MASTERS_VIEW,
      },
      {
        title: "PE checklist master",
        href: "/masters/checklists/pe",
        icon: BookOpenCheckIcon,
        permission: Permission.MASTERS_VIEW,
      },
      { title: "States", href: "/masters/states", icon: MapPinIcon, permission: Permission.MASTERS_VIEW },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Users & access",
        href: "/admin/users",
        icon: UsersIcon,
        permission: Permission.USERS_MANAGE,
        keywords: ["account", "role"],
      },
      { title: "Audit trail", href: "/admin/audit-trail", icon: HistoryIcon, permission: Permission.AUDIT_TRAIL_VIEW },
      { title: "Retention", href: "/admin/retention", icon: TimerResetIcon, permission: Permission.RETENTION_VIEW },
    ],
  },
];

export const allNavItems: NavItem[] = navigation.flatMap((group) => group.items);

/** Longest-prefix match, so /audit-runs/123 resolves to the "Audit runs" item. */
export function findNavItem(pathname: string): { item: NavItem; group: NavGroup } | null {
  let match: { item: NavItem; group: NavGroup } | null = null;
  for (const group of navigation) {
    for (const item of group.items) {
      const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (hit && (!match || item.href.length > match.item.href.length)) match = { item, group };
    }
  }
  return match;
}
