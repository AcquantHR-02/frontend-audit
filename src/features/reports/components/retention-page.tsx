"use client";

import { AlertTriangleIcon, ArchiveIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetAuditRunsQuery } from "@/features/audit-runs";
import { daysUntil, fyLabel, nextPurgeDate, purgeCutoff, purgeNotice } from "@/lib/domain";
import { formatDate, formatDateRange } from "@/lib/utils";

/** §12.14 — what the next purge removes. Purge is a full delete with no exceptions (no pinning). */
export function RetentionPage() {
  const today = new Date().toISOString().slice(0, 10);
  const purgeDate = nextPurgeDate(today);
  const cutoff = purgeCutoff(purgeDate);
  const notice = purgeNotice(today);
  const { data, isLoading } = useGetAuditRunsQuery({ size: 200, sort: "activityPeriodEnd,asc" });
  const eligible = (data?.content ?? []).filter((r) => r.activityPeriodEnd <= cutoff);

  return (
    <>
      <PageHeader
        title="Retention"
        description="Audit data is kept for two financial years. On 1 April, runs from older years are permanently deleted with their items, evidence files and findings."
      />
      {notice && (
        <Alert className="border-warning-border bg-warning-subtle text-warning">
          <AlertTriangleIcon />
          <AlertTitle>Purge in {notice.days} days</AlertTitle>
          <AlertDescription className="text-warning">
            Export anything you need from the runs below before {formatDate(purgeDate)}.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Next purge"
          value={<span className="text-lg">{formatDate(purgeDate)}</span>}
          hint={`in ${daysUntil(today, purgeDate)} days`}
        />
        <KpiCard label="Removes" value={<span className="text-lg">{fyLabel(cutoff)}</span>} hint="and earlier" />
        <KpiCard
          label="Runs scheduled"
          value={isLoading ? "—" : eligible.length}
          tone={eligible.length ? "warning" : undefined}
        />
        <KpiCard label="Notices" value={<span className="text-lg">30 + 7 days</span>} hint="before the purge" />
      </div>
      <Alert>
        <InfoIcon />
        <AlertDescription>
          Carried-forward evidence is copied into each newer run, so purging an old run never breaks a newer one. There
          are no exemptions or pinned runs.
        </AlertDescription>
      </Alert>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : eligible.length === 0 ? (
        <EmptyState
          icon={ArchiveIcon}
          title="Nothing scheduled for the next purge"
          description={`Only runs whose activity ended on or before ${formatDate(cutoff)} are removed on ${formatDate(purgeDate)}.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Run</TableHead>
                <TableHead>Audited party</TableHead>
                <TableHead>Activity period</TableHead>
                <TableHead className="text-right">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligible.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-mono text-xs">{run.code}</TableCell>
                  <TableCell>
                    {run.partyName} · {run.unitCode}
                  </TableCell>
                  <TableCell className="tabular">
                    {formatDateRange(run.activityPeriodStart, run.activityPeriodEnd)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/audit-runs/${run.id}`} className="text-primary hover:underline">
                      Open to export
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
