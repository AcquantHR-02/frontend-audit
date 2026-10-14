import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Acquant HR "A" mark + product name. `inverted` = for navy surfaces (sidebar). */
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Image src="/brand/acquant-mark.png" alt="" width={960} height={436} priority className="h-auto w-8" />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={cn("truncate text-sm font-semibold", inverted ? "text-white" : "text-foreground")}>
            Audit Management
          </span>
          <span className={cn("truncate text-[11px]", inverted ? "text-white/60" : "text-muted-foreground")}>
            by {siteConfig.organisation}
          </span>
        </span>
      )}
    </div>
  );
}

/** Full Acquant HR wordmark — light surfaces only (its navy lettering needs a light background). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/acquant-hr-wordmark.png"
      alt={`${siteConfig.organisation} — Quantifying Excellence`}
      width={840}
      height={165}
      priority
      className={cn("h-auto w-44", className)}
    />
  );
}
