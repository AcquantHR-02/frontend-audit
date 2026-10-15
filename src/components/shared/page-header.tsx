"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { findNavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Inline next to the title, e.g. a status badge. */
  badge?: ReactNode;
  /** Right-aligned actions; wrap below the title on narrow screens. */
  actions?: ReactNode;
  /** Defaults to the matching sidebar item's icon; `false` hides it. */
  icon?: LucideIcon | false;
  className?: string;
}

export function PageHeader({ title, description, badge, actions, icon, className }: PageHeaderProps) {
  const pathname = usePathname();
  const Icon = icon === false ? null : (icon ?? findNavItem(pathname)?.item.icon ?? null);

  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <span
            aria-hidden
            className="mt-0.5 hidden size-11 shrink-0 place-items-center rounded-xl border border-primary/15 bg-gradient-to-br from-accent to-card text-primary shadow-xs sm:grid [&_svg]:size-5"
          >
            <Icon />
          </span>
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {badge}
          </div>
          {description && <p className="max-w-3xl text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
