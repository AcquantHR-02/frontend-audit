import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import type { StatusMeta, StatusTone } from "@/lib/domain";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "border-success-border bg-success-subtle text-success",
        warning: "border-warning-border bg-warning-subtle text-warning",
        danger: "border-danger-border bg-danger-subtle text-danger",
        info: "border-info-border bg-info-subtle text-info",
        neutral: "border-neutral-border bg-neutral-subtle text-neutral",
        primary: "border-primary/20 bg-accent text-accent-foreground",
        violet: "border-violet-border bg-violet-subtle text-violet",
      } satisfies Record<StatusTone, string>,
      /** Dashed outline = draft/proposed decision, not final (e.g. party NA proposal). */
      draft: { true: "border-dashed bg-card", false: "" },
      /** Monospace for raw enum codes like NOT_COMPLIED. */
      mono: { true: "font-mono text-[11px] tracking-tight", false: "" },
    },
    defaultVariants: { tone: "neutral", draft: false, mono: false },
  },
);

type StatusBadgeProps = Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof statusBadgeVariants> & {
    /** Pass a `*Meta` entry from `@/lib/domain`, or a label + tone pair directly. */
    meta?: StatusMeta;
    label?: string;
    prefix?: string;
    dot?: boolean;
  };

/**
 * Status pill: dot + text + colour — status is never conveyed by colour alone.
 * Usage: <StatusBadge meta={complianceMeta[air.complianceStatus]} />
 */
export function StatusBadge({
  meta,
  label,
  tone,
  draft,
  mono,
  prefix,
  dot = true,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone: tone ?? meta?.tone, draft, mono }), className)} {...props}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {prefix && (
        <span className="border-r border-current pr-1.5 text-[9.5px] font-bold tracking-wider opacity-80">
          {prefix}
        </span>
      )}
      {label ?? meta?.label}
    </span>
  );
}
