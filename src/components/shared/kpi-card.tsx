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
  className?: string;
}

export function KpiCard({ label, value, hint, tone, icon, className }: KpiCardProps) {
  return (
    <div className={cn("min-w-0 rounded-lg border bg-card p-3 shadow-xs sm:p-4", className)}>
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
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
