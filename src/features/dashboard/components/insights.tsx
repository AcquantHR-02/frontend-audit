"use client";

import { format, parseISO } from "date-fns";
import { CalendarCheck2Icon } from "lucide-react";
import Link from "next/link";
import { cn, formatCount } from "@/lib/utils";
import type { DashboardData, DashboardDeadline } from "../api/dashboard.api";
import { BarList } from "@/components/shared/charts";
import { useGrowIn } from "@/hooks/use-motion";

const deadlineLabel: Record<DashboardDeadline["kind"], string> = {
  WINDOW_1_OPENS: "Window 1 opens",
  WINDOW_1_CLOSES: "Window 1 closes",
  WINDOW_2_CLOSES: "Window 2 closes",
};

function relativeDays(days: number) {
  return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`;
}

/** Closing windows get urgent as they near; an opening window is informational. */
function urgency(d: DashboardDeadline) {
  if (d.kind === "WINDOW_1_OPENS") return "bg-info-subtle text-info border-info-border";
  if (d.daysLeft <= 2) return "bg-danger-subtle text-danger border-danger-border";
  if (d.daysLeft <= 7) return "bg-warning-subtle text-warning border-warning-border";
  return "bg-neutral-subtle text-neutral border-neutral-border";
}

/** Upcoming window dates: calendar tile, party + run, and a "in N days" pill. */
export function DeadlineList({ deadlines }: { deadlines: DashboardDeadline[] }) {
  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-[13px] text-muted-foreground">
        <CalendarCheck2Icon className="size-6 text-success" aria-hidden />
        No windows open or close in the next 30 days.
      </div>
    );
  }
  return (
    <ul className="-mx-2 space-y-0.5">
      {deadlines.map((d) => {
        const date = parseISO(d.date);
        return (
          <li key={`${d.runId}-${d.kind}`}>
            <Link
              href={`/audit-runs/${d.runId}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="grid w-11 shrink-0 overflow-hidden rounded-lg border bg-background text-center leading-none">
                <span className="bg-muted py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                  {format(date, "MMM")}
                </span>
                <span className="py-1 text-base font-semibold tabular">{format(date, "d")}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {d.partyName} <span className="font-normal text-muted-foreground">· {d.unitCode}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {deadlineLabel[d.kind]} · <span className="font-mono">{d.runCode}</span>
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                  urgency(d),
                )}
              >
                {relativeDays(d.daysLeft)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Where non-compliance concentrates: NC items by Act, each row opening the matching findings. */
export function NcByAct({ rows }: { rows: DashboardData["ncByAct"] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[13px] text-muted-foreground">No non-compliances in published runs.</p>;
  }
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        <b className="text-foreground tabular">{formatCount(total)}</b> not-complied items across{" "}
        <b className="text-foreground tabular">{rows.length}</b> Acts
      </p>
      <BarList
        valueLabel="Not-complied items by Act"
        barClassName="bg-danger/75"
        rows={rows.slice(0, 6).map((r) => ({
          label: r.act,
          value: r.count,
          href: `/findings?search=${encodeURIComponent(r.act)}`,
        }))}
      />
    </div>
  );
}

/** Ordinal age buckets → one hue, darker = older; the oldest finding is called out as the headline. */
export function FindingsAging({
  aging,
  openFindings,
}: {
  aging: DashboardData["findingsAging"];
  openFindings: number;
}) {
  const grown = useGrowIn();
  if (openFindings === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-[13px] text-muted-foreground">
        <CalendarCheck2Icon className="size-6 text-success" aria-hidden />
        No open findings. Nice work.
      </div>
    );
  }
  const shades = ["bg-danger/35", "bg-danger/55", "bg-danger/75", "bg-danger"];
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular">{aging.oldestDays ?? 0}</span>
        <span className="text-sm text-muted-foreground">days — oldest open finding</span>
      </div>
      {/* Stacked share of open findings by age (2px gaps between segments). */}
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        {aging.buckets.map((b, i) =>
          b.count > 0 ? (
            <span
              key={b.label}
              className={cn(
                "h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full motion-reduce:transition-none",
                shades[i],
              )}
              style={{ width: grown ? `${(b.count / openFindings) * 100}%` : 0 }}
            />
          ) : null,
        )}
      </div>
      <ul className="space-y-1.5 text-[13px]" aria-label="Open findings by age">
        {aging.buckets.map((b, i) => (
          <li key={b.label} className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", shades[i])} aria-hidden />
            <span>{b.label}</span>
            <span className="ml-auto font-medium tabular">{formatCount(b.count)}</span>
            <span className="w-10 text-right text-xs text-muted-foreground tabular">
              {Math.round((b.count / openFindings) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
