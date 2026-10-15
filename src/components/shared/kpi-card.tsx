import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { StatusTone } from "@/lib/domain";
import { cn } from "@/lib/utils";

const valueTone: Partial<Record<StatusTone, string>> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  primary: "text-primary",
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
  /** Makes the whole card a link to the list behind the number. */
  href?: string;
  className?: string;
}

export function KpiCard({ label, value, hint, tone, icon, href, className }: KpiCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        {label}
        {icon && <span className="text-muted-foreground/70 [&_svg]:size-4">{icon}</span>}
      </div>
      <div
        className={cn(
          "mt-1.5 text-xl font-semibold tracking-tight break-words tabular sm:text-[22px]",
          tone && valueTone[tone],
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground">
          {hint}
          {href && (
            <ChevronRightIcon
              className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          )}
        </div>
      )}
    </>
  );
  const base = "min-w-0 rounded-lg border bg-card p-3 shadow-xs sm:p-4";
  return href ? (
    <Link
      href={href}
      className={cn(
        base,
        "group block transition-colors outline-none hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cn(base, className)}>{body}</div>
  );
}
