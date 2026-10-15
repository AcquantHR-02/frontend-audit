import { ArrowUpRightIcon } from "lucide-react";
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

/** Tinted icon chip; falls back to the brand tint when the card has no status tone. */
const chipTone: Record<StatusTone, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  neutral: "bg-neutral-subtle text-neutral",
  primary: "bg-accent text-primary",
  violet: "bg-violet-subtle text-violet",
};

const barTone: Partial<Record<StatusTone, string>> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatusTone;
  icon?: ReactNode;
  /** Makes the whole card a link to the list behind the number. */
  href?: string;
  /** 0–1 share shown as a slim meter under the value, e.g. published / total. */
  progress?: number;
  className?: string;
}

export function KpiCard({ label, value, hint, tone, icon, href, progress, className }: KpiCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="pt-0.5 text-xs font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span
            className={cn(
              "hidden size-8 shrink-0 place-items-center rounded-lg min-[480px]:grid [&_svg]:size-4",
              chipTone[tone ?? "primary"],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn(
          "-mt-1 text-2xl font-semibold tracking-tight break-words tabular sm:text-[26px]",
          tone && valueTone[tone],
        )}
      >
        {value}
      </div>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn("h-full rounded-full", (tone && barTone[tone]) ?? "bg-chart-1")}
            style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
          />
        </div>
      )}
      {hint && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">{hint}</span>
          {href && (
            <ArrowUpRightIcon
              className="ml-auto size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          )}
        </div>
      )}
    </>
  );
  const base = "relative min-w-0 overflow-hidden rounded-xl border bg-card p-4 shadow-xs";
  return href ? (
    <Link
      href={href}
      className={cn(
        base,
        "group block transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cn(base, className)}>{body}</div>
  );
}
