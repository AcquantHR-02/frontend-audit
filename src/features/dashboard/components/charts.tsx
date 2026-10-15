"use client";

import { format, parseISO } from "date-fns";
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatScore, scoreInTenths } from "@/lib/domain";
import { cn, formatCount } from "@/lib/utils";
import type { ScoreCounts } from "@/types/domain";

/**
 * Chart conventions (dataviz skill): one hue for magnitude, reserved status colours only for
 * Complied / Not complied / NA and always labelled, single axis, recessive grid, hover tooltip.
 */

/** Horizontal single-hue bars with direct labels; the value text uses ink, never the bar colour. */
export function BarList({
  rows,
  valueLabel,
}: {
  rows: { label: string; value: number; display?: string; href?: string }[];
  valueLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1" aria-label={valueLabel}>
      {rows.map((row) => {
        const content = (
          <>
            <span className="truncate" title={row.label}>
              {row.label}
            </span>
            <span
              className="h-2 overflow-hidden rounded-full bg-muted"
              title={`${row.label}: ${row.display ?? row.value}`}
            >
              <span
                className="block h-full rounded-full bg-chart-1 transition-[width] duration-500"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-medium tabular">{row.display ?? formatCount(row.value)}</span>
          </>
        );
        const grid = "grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_56px] items-center gap-3 text-[13px]";
        return (
          <li key={row.label}>
            {row.href ? (
              <Link
                href={row.href}
                className={`${grid} -mx-2 rounded-md px-2 py-1 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50`}
              >
                {content}
              </Link>
            ) : (
              <div className={`${grid} py-1`}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Compliance split: stacked status bar (2px gaps) + a labelled legend, so identity is never colour-alone. */
export function ComplianceSplit({ score }: { score: ScoreCounts }) {
  const stamped = score.complied + score.notComplied + score.notApplicable;
  const parts = [
    { key: "C", label: "Complied", value: score.complied, className: "bg-success" },
    { key: "NC", label: "Not complied", value: score.notComplied, className: "bg-danger" },
    { key: "NA", label: "Not applicable", value: score.notApplicable, className: "bg-neutral/50" },
  ];
  return (
    <div className="space-y-3">
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}
      >
        {parts.map((p) =>
          p.value > 0 ? (
            <span
              key={p.key}
              className={`${p.className} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(p.value / Math.max(1, stamped)) * 100}%` }}
              title={`${p.label}: ${formatCount(p.value)}`}
            />
          ) : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${p.className}`} aria-hidden />
            {p.label} <b className="tabular">{formatCount(p.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Score trend — single series (title names it): gradient area, headline + month-on-month delta,
 * direct label on the latest point only, crosshair tooltip. */
export function ScoreTrend({ data }: { data: { month: string; score: ScoreCounts }[] }) {
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const points = data.map((d) => ({
    month: format(parseISO(`${d.month}-01`), "MMM yy"),
    score: (scoreInTenths(d.score) ?? 0) / 10,
    label: formatScore(d.score),
    items: d.score.assignedTotal,
  }));
  const last = points.at(-1)!;
  const prev = points.at(-2);
  const delta = prev ? Math.round((last.score - prev.score) * 10) / 10 : 0;
  const min = Math.floor(Math.min(90, ...points.map((p) => p.score)) / 5) * 5;
  const DeltaIcon = delta > 0 ? TrendingUpIcon : delta < 0 ? TrendingDownIcon : MinusIcon;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-semibold tracking-tight tabular">{last.label}</div>
          <div className="text-xs text-muted-foreground">{last.month} · latest month</div>
        </div>
        {prev && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular",
              delta > 0 && "bg-success/10 text-success",
              delta < 0 && "bg-danger/10 text-danger",
              delta === 0 && "bg-muted text-muted-foreground",
            )}
          >
            <DeltaIcon className="size-3.5" aria-hidden />
            {delta > 0 ? "+" : ""}
            {delta} pts vs {prev.month}
          </span>
        )}
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer>
          <AreaChart data={points} margin={{ top: 20, right: 16, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              domain={[min, 100]}
              tickLine={false}
              axisLine={false}
              tickCount={4}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => `${v}%`}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof points)[number] | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
                    <div className="mb-0.5 text-muted-foreground">{p.month}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-chart-1" aria-hidden />
                      Score <b className="tabular">{p.label}</b>
                    </div>
                    <div className="text-muted-foreground tabular">{formatCount(p.items)} items assessed</div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)", fill: "var(--chart-1)" }}
              // Only the latest point is marked and labelled; every other value lives in the tooltip.
              dot={(props: { cx?: number; cy?: number; index?: number }) =>
                props.index === points.length - 1 ? (
                  <g key="last">
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={4.5}
                      fill="var(--chart-1)"
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                    <text
                      x={props.cx}
                      y={(props.cy ?? 0) - 10}
                      textAnchor="end"
                      fontSize={12}
                      fontWeight={600}
                      fill="var(--foreground)"
                    >
                      {last.label}
                    </text>
                  </g>
                ) : (
                  <g key={props.index} />
                )
              }
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
