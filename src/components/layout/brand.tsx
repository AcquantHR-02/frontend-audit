import { ShieldCheckIcon } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Product mark. `inverted` = for dark (navy) surfaces. */
export function Brand({
  inverted = false,
  compact = false,
  className,
}: {
  inverted?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          inverted ? "bg-white/12 text-white ring-1 ring-white/15" : "bg-primary text-primary-foreground",
        )}
      >
        <ShieldCheckIcon className="size-[18px]" aria-hidden />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={cn("truncate text-sm font-semibold", inverted ? "text-white" : "text-foreground")}>
            Audit Management
          </span>
          <span className={cn("truncate text-[11px]", inverted ? "text-white/60" : "text-muted-foreground")}>
            {siteConfig.organisation}
          </span>
        </span>
      )}
    </div>
  );
}
