"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan, useCurrentUser } from "@/hooks/use-current-user";
import { isAuditor, Permission } from "@/lib/auth";
import { formatScore, roleMeta, runPhaseMeta, scoreInTenths } from "@/lib/domain";
import { formatCount, formatDateRange } from "@/lib/utils";
import type { RunPhase } from "@/types/domain";
import { useGetDashboardQuery } from "../api/dashboard.api";
import { BarList, ComplianceSplit, ScoreTrend } from "./charts";

const descriptions = {
  AUDITOR_ADMIN: "Organisation-wide status of audit runs, reviews and findings across all Principal Employers.",
  AUDITOR_USER: "Your audit queue: runs in progress, reviews waiting on you and findings to follow up.",
  VENDOR_USER: "Audits across all your units, items waiting for your evidence and findings to remediate.",
  PE_USER: "Vendor audit results at your units, your own PE audits and open findings.",
} as const;

function greeting(date = new Date()) {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="py-4">{children}</CardContent>
    </Card>
  );
}

export function Overview() {
  const user = useCurrentUser();
  const router = useRouter();
  const canCreate = useCan(Permission.AUDIT_RUNS_CREATE);
  const { data, isLoading } = useGetDashboardQuery();
  if (!user) return null;
  const auditor = isAuditor(user);
  const inProgress = data ? data.totalRuns - data.runsByPhase.PUBLISHED : 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.fullName.split(" ")[0]}`}
        badge={<StatusBadge meta={roleMeta[user.role]} />}
        description={descriptions[user.role]}
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/audit-runs/new">
                <PlusIcon /> New audit run
              </Link>
            </Button>
          )
        }
      />

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Audit runs" value={formatCount(data.totalRuns)} hint={`${inProgress} in progress`} />
            {auditor ? (
              <KpiCard
                label="Awaiting review"
                value={formatCount(data.awaitingReview)}
                tone={data.awaitingReview ? "warning" : undefined}
                hint="submitted items"
              />
            ) : (
              <KpiCard
                label="Items to upload"
                value={formatCount(data.itemsToUpload)}
                tone={data.itemsToUpload ? "warning" : undefined}
                hint="in open windows"
              />
            )}
            <KpiCard label="Published this FY" value={formatCount(data.publishedThisFy)} />
            <KpiCard
              label="Open findings"
              value={formatCount(data.openFindings)}
              tone={data.openFindings ? "danger" : undefined}
            />
            <KpiCard
              label="Compliance score"
              value={formatScore(data.publishedScore)}
              tone="primary"
              hint="published runs"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              title="Audit runs by phase"
              action={<span className="text-xs text-muted-foreground">{data.totalRuns} runs</span>}
            >
              <BarList
                valueLabel="Runs per phase"
                rows={(Object.keys(runPhaseMeta) as RunPhase[]).map((phase) => ({
                  label: runPhaseMeta[phase].label,
                  value: data.runsByPhase[phase],
                }))}
              />
            </Panel>
            <Panel
              title="Compliance summary"
              action={<span className="text-xs text-muted-foreground">Published runs</span>}
            >
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular">
                  {formatScore(data.publishedScore)}
                </span>
                <span className="text-muted-foreground">compliance score</span>
              </div>
              <ComplianceSplit score={data.publishedScore} />
              <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground tabular">
                ({formatCount(data.publishedScore.complied)} + {formatCount(data.publishedScore.notApplicable)}) ÷{" "}
                {formatCount(data.publishedScore.assignedTotal)} items = {formatScore(data.publishedScore)}
              </p>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Panel title="Score trend by activity month">
              {data.trend.length > 1 ? (
                <ScoreTrend data={data.trend} />
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Trends appear after two or more months are published.
                </p>
              )}
            </Panel>
            <Panel title={auditor || user.role === "PE_USER" ? "Score by audited party" : "Score by month"}>
              {auditor || user.role === "PE_USER" ? (
                <BarList
                  valueLabel="Compliance score by party"
                  rows={data.partyScores.map((p) => ({
                    label: p.name,
                    value: (scoreInTenths(p.score) ?? 0) / 10,
                    display: formatScore(p.score),
                  }))}
                />
              ) : (
                <BarList
                  rows={data.trend.map((t) => ({
                    label: t.month,
                    value: (scoreInTenths(t.score) ?? 0) / 10,
                    display: formatScore(t.score),
                  }))}
                />
              )}
            </Panel>
          </div>

          <Panel
            title="Recent audit runs"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/audit-runs">View all</Link>
              </Button>
            }
          >
            <div className="-mx-6 -my-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="pl-6">Run</TableHead>
                    <TableHead>Audited party</TableHead>
                    <TableHead>Activity period</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead className="pr-6 text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentRuns.map((run) => (
                    <TableRow
                      key={run.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/audit-runs/${run.id}`)}
                    >
                      <TableCell className="pl-6 font-mono text-xs text-primary">{run.code}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{run.partyName}</span>
                          <span className="text-xs text-muted-foreground">
                            {run.unitCode} · {run.peName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular">
                        {formatDateRange(run.activityPeriodStart, run.activityPeriodEnd)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge meta={runPhaseMeta[run.phase]} />
                      </TableCell>
                      <TableCell className="pr-6 text-right font-medium tabular">{formatScore(run.score)}</TableCell>
                    </TableRow>
                  ))}
                  {data.recentRuns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        No audit runs yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
