"use client";

import {
  ChevronRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  FileBarChart2Icon,
  FileCheck2Icon,
  FileSpreadsheetIcon,
  GaugeIcon,
  Loader2Icon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterChip } from "@/components/shared/active-filters";
import { FilterSelect } from "@/components/shared/filter-select";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TABLE_MAX_HEIGHT } from "@/components/shared/data-table";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePrincipalEmployerOptions } from "@/features/masters";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { isAuditor } from "@/lib/auth";
import { auditTypeMeta, formatScore } from "@/lib/domain";
import { cn, formatCount, formatDate, formatDateRange } from "@/lib/utils";
import type { AuditType, ScoreCounts } from "@/types/domain";
import { useGetScoreRollupQuery } from "../api/reports.api";
import { exportScoreRollup } from "@/lib/export/excel";

const typeOptions = (Object.keys(auditTypeMeta) as AuditType[]).map((t) => ({
  value: t,
  label: auditTypeMeta[t].label,
}));

function Counts({ score, strong }: { score: ScoreCounts; strong?: boolean }) {
  return (
    <>
      <TableCell className="text-right tabular">{formatCount(score.complied)}</TableCell>
      <TableCell className={cn("text-right tabular", score.notComplied > 0 && "font-medium text-danger")}>
        {formatCount(score.notComplied)}
      </TableCell>
      <TableCell className="text-right tabular">{formatCount(score.notApplicable)}</TableCell>
      <TableCell className="text-right text-muted-foreground tabular">{formatCount(score.assignedTotal)}</TableCell>
      <TableCell className={cn("text-right tabular", strong && "font-semibold")}>{formatScore(score)}</TableCell>
    </>
  );
}

export function ReportsPage() {
  const user = useCurrentUser();
  const peOptions = usePrincipalEmployerOptions();
  const [peId, setPeId] = useUrlFilter("pe");
  const [type, setType] = useUrlFilter("type");
  const [from, setFrom] = useUrlFilter("from");
  const [to, setTo] = useUrlFilter("to");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, isFetching } = useGetScoreRollupQuery({
    peId: peId || undefined,
    auditType: (type || undefined) as AuditType | undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const periodLabel =
    from || to
      ? formatDateRange(from || "2000-01-01", to || new Date().toISOString().slice(0, 10))
      : "All published runs";

  async function exportExcel() {
    if (!data) return;
    setExporting(true);
    try {
      await exportScoreRollup(data.rows, data.total, periodLabel);
      toast.success("Score report downloaded");
    } catch {
      toast.error("Couldn't create the Excel file. Try again.");
    } finally {
      setExporting(false);
    }
  }

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Compliance score roll-up of published runs: audited party → unit. Score = (Complied + NA) ÷ items, rounded once."
        actions={
          <Button onClick={exportExcel} disabled={!data?.rows.length || exporting}>
            {exporting ? <Loader2Icon className="animate-spin" /> : <FileSpreadsheetIcon />} Export Excel
          </Button>
        }
      />

      <FilterBar rowClassName="items-end gap-3">
        {isAuditor(user) && (
          <FilterSelect label="Principal Employer" value={peId} onChange={setPeId} options={peOptions} />
        )}
        <FilterSelect label="Type" value={type} onChange={setType} options={typeOptions} />
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <div className="min-w-36 flex-1 space-y-1 sm:flex-none">
            <Label htmlFor="rep-from" className="text-xs text-muted-foreground">
              Activity ending from
            </Label>
            <Input
              id="rep-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
          <div className="min-w-36 flex-1 space-y-1 sm:flex-none">
            <Label htmlFor="rep-to" className="text-xs text-muted-foreground">
              to
            </Label>
            <Input
              id="rep-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </div>
        <FilterChip id="from" label="Ending from" value={from && formatDate(from)} onClear={() => setFrom("")} />
        <FilterChip id="to" label="Ending to" value={to && formatDate(to)} onClear={() => setTo("")} />
      </FilterBar>

      {data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Published runs" icon={<FileCheck2Icon />} value={formatCount(data.runCount)} />
          <KpiCard
            label="Complied"
            icon={<CircleCheckIcon />}
            value={formatCount(data.total.complied)}
            tone="success"
          />
          <KpiCard
            label="Not complied"
            icon={<CircleXIcon />}
            value={formatCount(data.total.notComplied)}
            tone={data.total.notComplied ? "danger" : undefined}
          />
          <KpiCard
            label="Overall score"
            icon={<GaugeIcon />}
            value={formatScore(data.total)}
            tone="primary"
            hint={periodLabel}
          />
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.rows.length ? (
        <EmptyState
          icon={FileBarChart2Icon}
          title="No published runs in this selection"
          description="Adjust the filters or publish audit runs to see scores here."
        />
      ) : (
        <div className={cn("overflow-hidden rounded-lg border bg-card transition-opacity", isFetching && "opacity-60")}>
          <Table containerClassName={cn("overflow-auto overscroll-contain", TABLE_MAX_HEIGHT)}>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Audited party / unit</TableHead>
                <TableHead className="text-right">Complied</TableHead>
                <TableHead className="text-right">Not complied</TableHead>
                <TableHead className="text-right">NA</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const open = expanded.has(row.id);
                return (
                  <Fragment key={row.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggle(row.id)} aria-expanded={open}>
                      <TableCell>
                        <span className="flex items-center gap-1.5 font-medium">
                          <ChevronRightIcon
                            className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")}
                            aria-hidden
                          />
                          {row.partyName}
                          <span className="rounded border px-1 font-mono text-[10px] font-normal text-muted-foreground">
                            {row.auditType}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            · {row.units.length} unit{row.units.length === 1 ? "" : "s"}
                          </span>
                        </span>
                      </TableCell>
                      <Counts score={row.score} strong />
                    </TableRow>
                    {open &&
                      row.units.map((unit) => (
                        <TableRow key={`${row.id}-${unit.unitCode}`} className="bg-muted/20">
                          <TableCell className="pl-11 text-muted-foreground">
                            <span className="font-mono text-xs">{unit.unitCode}</span> · {unit.unitName}
                          </TableCell>
                          <Counts score={unit.score} />
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Grand total</TableCell>
                <Counts score={data.total} strong />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </>
  );
}
