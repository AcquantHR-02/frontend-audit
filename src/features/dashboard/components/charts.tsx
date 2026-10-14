"use client";

import { format, parseISO } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatScore, scoreInTenths } from "@/lib/domain";
import { formatCount } from "@/lib/utils";
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
  rows: { label: string; value: number; display?: string }[];
  valueLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5" aria-label={valueLabel}>
      {rows.map((row) => (
        <li
          key={row.label}
          className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_56px] items-center gap-3 text-[13px]"
        >
          <span className="truncate" title={row.label}>
            {row.label}
          </span>
          <span
            className="h-2 overflow-hidden rounded-full bg-muted"
            title={`${row.label}: ${row.display ?? row.value}`}
          >
            <span className="block h-full rounded-full bg-chart-1" style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium tabular">{row.display ?? formatCount(row.value)}</span>
        </li>
      ))}
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

/** Score trend — single series (no legend; the card title names it), crosshair tooltip. */
export function ScoreTrend({ data }: { data: { month: string; score: ScoreCounts }[] }) {
  const points = data.map((d) => ({
    month: format(parseISO(`${d.month}-01`), "MMM yy"),
    score: (scoreInTenths(d.score) ?? 0) / 10,
    label: formatScore(d.score),
    items: d.score.assignedTotal,
  }));
  const min = Math.floor(Math.min(90, ...points.map((p) => p.score)) / 5) * 5;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            domain={[min, 100]}
            tickLine={false}
            axisLine={false}
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
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                  <div className="font-medium">{p.month}</div>
                  <div>
                    Score <b className="tabular">{p.label}</b> · {formatCount(p.items)} items
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
