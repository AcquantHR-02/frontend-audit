"use client";

import { AlertTriangleIcon, CalendarPlusIcon, RepeatIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cadenceMeta, generatePeriods, type PeriodPreset } from "@/lib/domain";
import { formatDateRange } from "@/lib/utils";
import type { PeriodInput, PreviewItem } from "../../api/audit-runs.api";

const presets: { value: PeriodPreset; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly (FY)" },
  { value: "HALF_YEARLY", label: "Half-yearly (FY)" },
  { value: "WHOLE", label: "Whole activity period" },
];

export type PeriodMap = Record<string, PeriodInput[]>;

/**
 * §6 Step 2a — LIFETIME / ONE_TIME items are created automatically; PERIODIC items get one AIR
 * per period the auditor chooses. Bulk-add is a convenience, not a rules engine.
 */
export function PeriodicItemsStep({
  items,
  activityStart,
  activityEnd,
  periods,
  onChange,
}: {
  items: PreviewItem[];
  activityStart: string;
  activityEnd: string;
  periods: PeriodMap;
  onChange: (next: PeriodMap) => void;
}) {
  const automatic = items.filter((i) => i.cadence !== "PERIODIC");
  const periodic = items.filter((i) => i.cadence === "PERIODIC");
  const carried = automatic.filter((i) => i.willCarryForward).length;
  const missing = periodic.filter((i) => !periods[i.id]?.length).length;

  const merge = (id: string, add: PeriodInput[]) => {
    const existing = periods[id] ?? [];
    const keys = new Set(existing.map((p) => `${p.periodStart}:${p.periodEnd}`));
    const fresh = add.filter((p) => !keys.has(`${p.periodStart}:${p.periodEnd}`));
    return [...existing, ...fresh].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  };
  const applyPreset = (preset: PeriodPreset, ids: string[]) => {
    const generated = generatePeriods(activityStart, activityEnd, preset);
    const next = { ...periods };
    for (const id of ids) next[id] = merge(id, generated);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Created automatically · {automatic.length} items</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Lifetime and one-time items get one item each.{" "}
          {carried > 0 ? (
            <>
              <b className="text-foreground">{carried}</b> will be pre-marked <b className="text-success">Complied</b>{" "}
              from earlier valid evidence (you can re-stamp before publishing).
            </>
          ) : (
            "None have earlier valid evidence, so all start as pending."
          )}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Periodic items · {periodic.length}</h3>
            <p className="text-[13px] text-muted-foreground">
              Choose which compliance periods you will verify for each item.
            </p>
          </div>
          {periodic.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <RepeatIcon /> Apply to all periodic items
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Add periods to every item
                </DropdownMenuLabel>
                {presets.map((p) => (
                  <DropdownMenuItem
                    key={p.value}
                    onSelect={() =>
                      applyPreset(
                        p.value,
                        periodic.map((i) => i.id),
                      )
                    }
                  >
                    {p.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onChange({})}>
                  Clear all periods
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {missing > 0 && (
          <Alert className="border-warning-border bg-warning-subtle text-warning">
            <AlertTriangleIcon />
            <AlertTitle>
              {missing} periodic item{missing === 1 ? " has" : "s have"} no periods
            </AlertTitle>
            <AlertDescription className="text-warning">
              They won&apos;t be audited in this run. That&apos;s allowed, but double-check it&apos;s intentional.
            </AlertDescription>
          </Alert>
        )}

        <ul className="divide-y rounded-lg border bg-card">
          {periodic.map((item) => {
            const list = periods[item.id] ?? [];
            return (
              <li key={item.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                      {item.actShortName}
                    </span>
                    <StatusBadge meta={cadenceMeta[item.cadence]} dot={false} />
                  </div>
                  <p className="mt-0.5">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {list.length === 0 && <span className="text-xs text-muted-foreground">No periods yet</span>}
                    {list.map((p) => (
                      <span
                        key={`${p.periodStart}:${p.periodEnd}`}
                        className="inline-flex items-center gap-1 rounded-md border bg-accent px-2 py-0.5 text-xs text-accent-foreground tabular"
                      >
                        {formatDateRange(p.periodStart, p.periodEnd)}
                        <button
                          type="button"
                          aria-label={`Remove period ${p.periodStart} to ${p.periodEnd}`}
                          className="rounded text-muted-foreground hover:text-foreground"
                          onClick={() => onChange({ ...periods, [item.id]: list.filter((x) => x !== p) })}
                        >
                          <XIcon className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RepeatIcon /> Bulk add
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {presets.map((p) => (
                        <DropdownMenuItem key={p.value} onSelect={() => applyPreset(p.value, [item.id])}>
                          {p.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <CustomPeriodButton
                    min={activityStart}
                    max={activityEnd}
                    onAdd={(p) => onChange({ ...periods, [item.id]: merge(item.id, [p]) })}
                  />
                </div>
              </li>
            );
          })}
          {periodic.length === 0 && (
            <li className="p-4 text-[13px] text-muted-foreground">This checklist has no periodic items.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function CustomPeriodButton({ min, max, onAdd }: { min: string; max: string; onAdd: (p: PeriodInput) => void }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(min);
  const [end, setEnd] = useState(max);
  const [due, setDue] = useState("");
  const invalid = !start || !end || end < start;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <CalendarPlusIcon /> Custom
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <p className="text-sm font-medium">Add a period</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs">
            From
            <Input type="date" value={start} min={min} max={max} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="space-y-1 text-xs">
            To
            <Input type="date" value={end} min={min} max={max} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <label className="block space-y-1 text-xs">
          Due date <span className="text-muted-foreground">(optional, shown on reports)</span>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <Button
          size="sm"
          className="w-full"
          disabled={invalid}
          onClick={() => {
            onAdd({ periodStart: start, periodEnd: end, dueDate: due || null });
            setOpen(false);
          }}
        >
          Add period
        </Button>
      </PopoverContent>
    </Popover>
  );
}
