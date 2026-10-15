"use client";

import { format, parseISO } from "date-fns";
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { useGrowIn } from "@/hooks/use-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatScore, runPhaseMeta, scoreInTenths, type StatusTone } from "@/lib/domain";
import { cn, formatCount } from "@/lib/utils";
import type { RunPhase, ScoreCounts } from "@/types/domain";

/**
 * Chart conventions (dataviz skill): one hue for magnitude, reserved status colours only for
 * Complied / Not complied / NA and always labelled, single axis, recessive grid, hover tooltip.
 */

/** Horizontal single-hue bars with direct labels; the value text uses ink, never the bar colour. */
export function BarList({
  rows,
  valueLabel,
  barClassName = "bg-chart-1",
}: {
  rows: { label: string; value: number; display?: string; href?: string }[];
  valueLabel?: string;
  /** Bar fill; defaults to the single magnitude hue. */
  barClassName?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const grown = useGrowIn();
  return (
    <ul className="space-y-1" aria-label={valueLabel}>
      {rows.map((row, index) => {
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
                className={cn(
                  "block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                  barClassName,
                )}
                style={{ width: grown ? `${(row.value / max) * 100}%` : 0, transitionDelay: `${index * 60}ms` }}
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
          <AreaChart data={points} margin={{ top: 22, right: 20, bottom: 0, left: 0 }}>
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
              width={44}
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

/**
 * Compliance ring — a single headline share (score), so one arc in the brand hue; the C / NC / NA
 * breakdown sits beside it as labelled rows (status colour always paired with text).
 */
export function ComplianceRing({ score }: { score: ScoreCounts }) {
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const share = (scoreInTenths(score) ?? 0) / 1000;
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const total = Math.max(1, score.assignedTotal);
  const grown = useGrowIn();
  const rows = [
    { label: "Complied", value: score.complied, dot: "bg-success" },
    { label: "Not complied", value: score.notComplied, dot: "bg-danger" },
    { label: "Not applicable", value: score.notApplicable, dot: "bg-neutral" },
  ];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative size-36 shrink-0">
        <svg
          viewBox="0 0 120 120"
          className="size-full -rotate-90"
          role="img"
          aria-label={`Compliance score ${formatScore(score)}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" />
              <stop offset="100%" stopColor="var(--brand-cyan)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - (grown ? share : 0))}
            className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-[26px] leading-none font-semibold tracking-tight tabular">
            {scoreInTenths(score) === null ? (
              "—"
            ) : (
              <AnimatedNumber value={(scoreInTenths(score) ?? 0) / 10} decimals={1} suffix="%" />
            )}
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground">compliance</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="space-y-1">
            <div className="flex items-center gap-2 text-[13px]">
              <span className={cn("size-2 rounded-full", row.dot)} aria-hidden />
              <span>{row.label}</span>
              <span className="ml-auto font-medium tabular">{formatCount(row.value)}</span>
              <span className="w-12 text-right text-xs text-muted-foreground tabular">
                {Math.round((row.value / total) * 1000) / 10}%
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                  row.dot,
                )}
                style={{ width: grown ? `${(row.value / total) * 100}%` : 0 }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const phaseDot: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-neutral",
  primary: "bg-primary",
  violet: "bg-violet",
};

/** Run pipeline: one clickable tile per phase in workflow order, opening the filtered run list. */
export function PhaseTiles({ counts, total }: { counts: Record<RunPhase, number>; total: number }) {
  const phases = Object.keys(runPhaseMeta) as RunPhase[];
  const grown = useGrowIn();
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {phases.map((phase, i) => {
        const count = counts[phase];
        const meta = runPhaseMeta[phase];
        return (
          <li key={phase}>
            <Link
              href={`/audit-runs?phase=${phase}`}
              className={cn(
                "group flex h-full flex-col gap-1.5 rounded-lg border bg-background/40 p-3 transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                count === 0 && "opacity-60 hover:opacity-100",
              )}
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="grid size-4 place-items-center rounded-full bg-muted text-[10px] font-semibold tabular">
                  {i + 1}
                </span>
                <span className="truncate">{meta.label}</span>
              </span>
              <span className="flex items-baseline justify-between gap-2">
                <AnimatedNumber value={count} className="text-xl font-semibold tracking-tight tabular" />
                <span className="text-[11px] text-muted-foreground tabular">
                  {Math.round((count / Math.max(1, total)) * 100)}%
                </span>
              </span>
              <span className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                    phaseDot[meta.tone],
                  )}
                  style={{
                    width: grown ? `${(count / Math.max(1, total)) * 100}%` : 0,
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
