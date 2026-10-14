"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { findNavItem } from "@/config/navigation";

/** Home › [Group] › Section, derived from the navigation config (detail pages extend this later). */
export function AppBreadcrumbs() {
  const pathname = usePathname();
  const match = findNavItem(pathname);

  const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: "/overview" }];
  if (match && match.item.href !== "/overview") {
    if (match.group.label) crumbs.push({ label: match.group.label });
    crumbs.push({ label: match.item.title, href: pathname === match.item.href ? undefined : match.item.href });
    if (pathname !== match.item.href) crumbs.push({ label: "Details" });
  } else if (match) {
    crumbs.push({ label: match.item.title });
  }

  return (
    <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
      <BreadcrumbList className="flex-nowrap text-[13px]">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className={index < crumbs.length - 2 ? "hidden sm:inline-flex" : undefined}>
                {isLast ? (
                  <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
