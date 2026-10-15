"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  FileCheck2Icon,
  GaugeIcon,
  MinusIcon,
  RepeatIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/components/layout/page-title";
import { BarList, ScoreTrend } from "@/components/shared/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auditTypeMeta, formatScore, runPhaseMeta, scoreInTenths } from "@/lib/domain";
import { cn, formatCount, formatDate, formatDateRange } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { AuditType, ScoreCounts } from "@/types/domain";
import { useGetScorecardQuery, type PartyScorecard } from "../api/reports.api";

const tenths = (score: ScoreCounts) => scoreInTenths(score) ?? 0;

/** Points between two scores, one decimal: "+2.4" / "−1.0" / "0.0". */
function ScoreDelta({ from, to }: { from: ScoreCounts; to: ScoreCounts }) {
  const delta = (tenths(to) - tenths(from)) / 10;
  const Icon = delta > 0 ? TrendingUpIcon : delta < 0 ? TrendingDownIcon : MinusIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular",
        delta > 0 && "text-success",
        delta < 0 && "text-danger",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {delta > 0 ? "+" : delta < 0 ? "−" : ""}
      {Math.abs(delta).toFixed(1)} pts
    </span>
  );
}

/** One audited party's track record: the page a client or auditor opens before a review meeting. */
export function ScorecardPage({ auditType, partyId }: { auditType: AuditType; partyId: string }) {
  const { data, error, isLoading } = useGetScorecardQuery({ auditType, partyId });
  usePageTitle(data?.party.name);

  if ((error as ApiError | undefined)?.status === 404) {
    return (
      <EmptyState
        icon={TrophyIcon}
        title="Scorecard not found"
        description="This party doesn't exist, or you don't have access to its audits."
      />
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/reports">
          <ArrowLeftIcon /> Reports
        </Link>
      </Button>
      {isLoading || !data ? <ScorecardSkeleton /> : <ScorecardContent data={data} />}
    </>
  );
}

function ScorecardSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-14 w-80" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function ScorecardContent({ data }: { data: PartyScorecard }) {
  const router = useRouter();
  const { party, summary } = data;
  const kind = party.auditType === "VENDOR" ? "Vendor" : "Principal Employer (own audits)";

  return (
    <>
      <PageHeader
        title={party.name}
        icon={TrophyIcon}
        badge={<StatusBadge meta={auditTypeMeta[party.auditType]} dot={false} />}
        description={[
          kind,
          party.legalName,
          `${data.units.length} unit${data.units.length === 1 ? "" : "s"}`,
          `${formatCount(summary.totalRuns)} audit runs`,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <Button asChild variant="outline">
            <Link href={`/audit-runs?search=${encodeURIComponent(party.name)}`}>
              All audit runs <ArrowRightIcon />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Latest score"
          icon={<GaugeIcon />}
          tone="primary"
          value={summary.latest ? formatScore(summary.latest.score) : "—"}
          hint={
            summary.latest && summary.previous ? (
              <>
                <ScoreDelta from={summary.previous.score} to={summary.latest.score} /> vs previous audit
              </>
            ) : summary.latest ? (
              `Activity to ${formatDate(summary.latest.periodEnd)}`
            ) : (
              "No published audit yet"
            )
          }
          href={summary.latest ? `/audit-runs/${summary.latest.runId}` : undefined}
        />
        <KpiCard
          label="Overall score"
          icon={<FileCheck2Icon />}
          value={formatScore(summary.overall)}
          hint={`${formatCount(summary.publishedRuns)} published · ${formatCount(summary.overall.assignedTotal)} items`}
          tone="success"
        />
        <KpiCard
          label="Open findings"
          icon={<CircleAlertIcon />}
          value={formatCount(summary.openFindings)}
          tone={summary.openFindings ? "danger" : undefined}
          hint={`${formatCount(summary.resolvedFindings)} resolved`}
          href={`/findings?status=OPEN&search=${encodeURIComponent(party.name)}`}
        />
        <KpiCard
          label="Oldest open finding"
          icon={<CalendarClockIcon />}
          value={summary.oldestOpenDays === null ? "—" : `${summary.oldestOpenDays} days`}
          tone={summary.oldestOpenDays !== null && summary.oldestOpenDays >= 60 ? "warning" : undefined}
          hint={summary.oldestOpenDays === null ? "Nothing open" : "since the run was published"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Score trend by activity month">
          {data.trend.length > 1 ? (
            <ScoreTrend data={data.trend} />
          ) : (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              The trend appears once two or more months are published.
            </p>
          )}
        </Panel>
        <Panel title="Not complied by Act" action={<span className="text-xs text-muted-foreground">Published</span>}>
          {data.ncByAct.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">No non-compliance in published audits.</p>
          ) : (
            <BarList
              valueLabel="Not-complied items by Act"
              barClassName="bg-danger/75"
              rows={data.ncByAct.map((r) => ({ label: r.act, value: r.count }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Units" action={<span className="text-xs text-muted-foreground">Latest published score</span>}>
          <ul className="-my-1 divide-y">
            {data.units.map((unit) => {
              const latest = unit.latest;
              return (
                <li key={unit.unitId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      <span className="font-mono text-xs text-muted-foreground">{unit.unitCode}</span> · {unit.unitName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {unit.peName} · {unit.runCount} run{unit.runCount === 1 ? "" : "s"}
                      {latest && ` · latest ${latest.code}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={latest ? tenths(latest.score) / 10 : 0}
                      className="hidden h-1.5 w-24 sm:block"
                      aria-label={`${unit.unitCode} latest score`}
                    />
                    {latest ? (
                      <Link
                        href={`/audit-runs/${latest.runId}`}
                        className="w-14 text-right text-[13px] font-semibold tabular hover:underline"
                      >
                        {formatScore(latest.score)}
                      </Link>
                    ) : (
                      <span className="w-14 text-right text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          title="Repeat non-compliance"
          action={<span className="text-xs text-muted-foreground">Not complied in 2+ audits</span>}
        >
          {data.repeatNc.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-[13px] text-muted-foreground">
              <RepeatIcon className="size-5 text-success" aria-hidden />
              No requirement has failed more than once.
            </div>
          ) : (
            <ul className="-my-1 divide-y">
              {data.repeatNc.slice(0, 6).map((r) => (
                <li key={`${r.act}-${r.requirement}`} className="flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 grid h-6 min-w-6 place-items-center rounded-md bg-danger-subtle px-1.5 text-xs font-semibold text-danger tabular">
                    {r.count}×
                  </span>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[13px] font-medium">{r.requirement}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{r.act}</span> · last in activity to {formatDate(r.lastPeriodEnd)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Audit history" contentClassName="p-0">
          <Table containerClassName="max-h-[26rem] overflow-auto overscroll-contain">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Run</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="hidden md:table-cell">Activity period</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead className="pr-4 text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.runs.map((run) => (
                <TableRow key={run.id} className="cursor-pointer" onClick={() => router.push(`/audit-runs/${run.id}`)}>
                  <TableCell className="pl-4 font-mono text-xs">
                    <Link
                      href={`/audit-runs/${run.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {run.code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{run.unitCode}</TableCell>
                  <TableCell className="hidden tabular md:table-cell">
                    {formatDateRange(run.activityPeriodStart, run.activityPeriodEnd)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge meta={runPhaseMeta[run.phase]} />
                  </TableCell>
                  <TableCell className="pr-4 text-right font-medium tabular">{formatScore(run.score)}</TableCell>
                </TableRow>
              ))}
              {data.runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No audit runs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Panel>

        <Panel
          title="Open findings"
          action={
            summary.openFindings > 0 && (
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href={`/findings?status=OPEN&search=${encodeURIComponent(party.name)}`}>
                  View all <ArrowRightIcon />
                </Link>
              </Button>
            )
          }
        >
          {data.openFindings.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">No open findings.</p>
          ) : (
            <ul className="-mx-2 -my-1">
              {data.openFindings.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/findings/${f.id}`}
                    className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13px] font-medium">{f.requirement}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{f.act}</span> · {f.unitCode} · {f.runCode}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular",
                        f.ageDays >= 60 ? "bg-danger-subtle text-danger" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {f.ageDays}d
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
