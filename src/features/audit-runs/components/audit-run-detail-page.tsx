"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  CircleXIcon,
  ClipboardCheckIcon,
  FileSpreadsheetIcon,
  GaugeIcon,
  InboxIcon,
  InfoIcon,
  ListChecksIcon,
  LockIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { exportRunReport } from "@/lib/export/excel";
import { cadenceMeta, canPartyUpload, complianceMeta, formatScore, runPhaseMeta, submissionMeta } from "@/lib/domain";
import { cn, formatDate, formatDateRange } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import type { AuditItemResult, AuditRunView, RunPhase } from "@/types/domain";
import { useGetAuditRunQuery, useGetRunItemsQuery } from "../api/audit-runs.api";
import { AirDrawer } from "./workspace/air-drawer";
import { PhaseActions } from "./workspace/phase-actions";

type Tab = "all" | "action" | "submitted" | "stamped";

const columns: DataTableColumn<AuditItemResult>[] = [
  {
    accessorKey: "actNameSnapshot",
    header: "Act",
    cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.actNameSnapshot}</span>,
    meta: { className: "w-24" },
  },
  {
    accessorKey: "descriptionSnapshot",
    header: "Requirement",
    cell: ({ row }) => <span className="line-clamp-2 min-w-56">{row.original.descriptionSnapshot}</span>,
  },
  {
    accessorKey: "cadenceSnapshot",
    header: "Cadence",
    cell: ({ row }) => <StatusBadge meta={cadenceMeta[row.original.cadenceSnapshot]} dot={false} />,
    meta: { className: "hidden w-28 sm:table-cell" },
  },
  {
    id: "period",
    header: "Period",
    cell: ({ row }) =>
      row.original.periodStart ? (
        <span className="tabular">{formatDateRange(row.original.periodStart, row.original.periodEnd)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    meta: { className: "hidden w-40 md:table-cell" },
  },
  {
    accessorKey: "evidenceCount",
    header: "Evidence",
    cell: ({ row }) => <span className="text-muted-foreground tabular">{row.original.evidenceCount || "—"}</span>,
    meta: { className: "hidden w-20 lg:table-cell" },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.complianceStatus ? (
          <StatusBadge meta={complianceMeta[row.original.complianceStatus]} />
        ) : (
          <StatusBadge meta={submissionMeta[row.original.submissionStatus]} draft />
        )}
        {row.original.isCarriedForward && <StatusBadge tone="violet" label="Carried forward" dot={false} />}
      </div>
    ),
    meta: { className: "w-52" },
  },
];

const timeline: { phase: RunPhase; label: string }[] = [
  { phase: "WINDOW_1", label: "Window 1" },
  { phase: "REVIEW", label: "Review" },
  { phase: "WINDOW_2", label: "Window 2" },
  { phase: "FINAL_REVIEW", label: "Final review" },
  { phase: "PUBLISHED", label: "Published" },
];
const order: RunPhase[] = ["SCHEDULED", "WINDOW_1", "REVIEW", "WINDOW_2", "FINAL_REVIEW", "PUBLISHED"];

function PhaseTimeline({ run }: { run: AuditRunView }) {
  const current = order.indexOf(run.phase);
  const skippedW2 = !run.window2Start && current >= order.indexOf("FINAL_REVIEW");
  const dates: Partial<Record<RunPhase, string>> = {
    WINDOW_1: formatDateRange(run.window1Start, run.window1End),
    WINDOW_2: run.window2Start
      ? formatDateRange(run.window2Start, run.window2End)
      : skippedW2
        ? "Skipped"
        : "If needed",
    PUBLISHED: run.publishedAt ? formatDate(run.publishedAt) : undefined,
  };
  return (
    <ol
      className="grid grid-cols-2 gap-y-4 rounded-xl border bg-card px-4 py-4 shadow-xs sm:grid-cols-5 sm:px-5"
      aria-label="Run phases"
    >
      {timeline.map((step, i) => {
        const index = order.indexOf(step.phase);
        const done = index < current || (step.phase === "PUBLISHED" && run.phase === "PUBLISHED");
        const active = step.phase === run.phase && run.phase !== "PUBLISHED";
        const skipped = step.phase === "WINDOW_2" && skippedW2;
        return (
          <li
            key={step.phase}
            className={cn("relative flex items-start gap-2.5 pr-2", skipped && "opacity-60")}
            aria-current={active ? "step" : undefined}
          >
            {/* Connector to the next step (desktop row only). */}
            {i < timeline.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-3.5 right-0 left-10 hidden h-0.5 rounded-full sm:block",
                  done ? "bg-success/60" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold tabular ring-4 ring-card",
                done && "border-success bg-success text-white",
                active && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/20",
                !done && !active && "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? <CheckIcon className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className="relative z-10 min-w-0 bg-card pr-2">
              <span className={cn("block text-[13px] font-medium", active && "text-primary")}>{step.label}</span>
              <span className="block text-xs text-muted-foreground tabular">
                {active ? "Current phase" : (dates[step.phase] ?? (done ? "Done" : "Upcoming"))}
              </span>
              {active && dates[step.phase] && (
                <span className="block text-xs text-muted-foreground tabular">{dates[step.phase]}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Run workspace (§4, §6): party uploads, auditor review, phase actions. */
export function AuditRunDetailPage({ runId }: { runId: string }) {
  const user = useCurrentUser();
  const { data: run, error } = useGetAuditRunQuery(runId);
  const { data: items, isLoading } = useGetRunItemsQuery(runId);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [openAirId, setOpenAirId] = useState<string | null>(null);

  const isParty =
    !!run &&
    !!user &&
    ((run.auditType === "VENDOR" && user.role === "VENDOR_USER" && user.vendorId === run.vendorId) ||
      (run.auditType === "PE" && user.role === "PE_USER" && user.peId === run.peId));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((air) => {
      if (q && !`${air.descriptionSnapshot} ${air.actNameSnapshot}`.toLowerCase().includes(q)) return false;
      if (tab === "submitted") return air.submissionStatus === "SUBMITTED";
      if (tab === "stamped") return air.complianceStatus !== null;
      if (tab === "action") {
        return isParty && run
          ? canPartyUpload(run.phase, air) && air.submissionStatus === "PENDING"
          : air.complianceStatus === null || air.complianceStatus === "NOT_COMPLIED";
      }
      return true;
    });
  }, [items, search, tab, isParty, run]);

  if ((error as ApiError | undefined)?.status === 404) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title="Audit run not found"
        description="It may not exist, or you don't have access to it."
      />
    );
  }
  if (!run) return <Skeleton className="h-40 w-full" />;

  const submitted = items?.filter((i) => i.submissionStatus === "SUBMITTED").length ?? 0;
  const openAir = items?.find((i) => i.id === openAirId) ?? null;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/audit-runs">
          <ArrowLeftIcon /> Audit runs
        </Link>
      </Button>
      <PageHeader
        title={`${run.code} · ${run.partyName}`}
        badge={<StatusBadge meta={runPhaseMeta[run.phase]} />}
        description={`${run.auditType === "VENDOR" ? "Vendor audit" : "PE audit"} · ${run.unitCode} ${run.unitName} · ${run.peName} · activity ${formatDateRange(run.activityPeriodStart, run.activityPeriodEnd)}`}
        actions={
          items && (
            <>
              <Button variant="outline" onClick={() => exportRunReport(run, items)}>
                <FileSpreadsheetIcon /> Export Excel
              </Button>
              <PhaseActions run={run} airs={items} />
            </>
          )
        }
      />

      <PhaseTimeline run={run} />

      {isParty && <PartyBanner run={run} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Items" icon={<ListChecksIcon />} value={run.score.assignedTotal} />
        <KpiCard label="Submitted" icon={<InboxIcon />} value={submitted} hint="awaiting stamp" />
        <KpiCard label="Complied" icon={<CircleCheckIcon />} value={run.score.complied} tone="success" />
        <KpiCard label="Not applicable" icon={<CircleSlashIcon />} value={run.score.notApplicable} />
        <KpiCard
          label="Not complied"
          icon={<CircleXIcon />}
          value={run.score.notComplied}
          tone={run.score.notComplied ? "danger" : undefined}
        />
        <KpiCard
          label="Score"
          icon={<GaugeIcon />}
          value={formatScore(run.score)}
          tone="primary"
          hint={`${run.score.pending} not stamped`}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="max-w-full overflow-x-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="action">{isParty ? "To upload" : "Needs attention"}</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="stamped">Stamped</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative ml-auto w-full sm:w-64">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="pl-8"
              aria-label="Search items"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(i) => i.id}
          isLoading={isLoading}
          onRowClick={(air) => setOpenAirId(air.id)}
          empty={
            <EmptyState
              icon={ClipboardCheckIcon}
              title="Nothing here"
              description="No items match this view."
              className="rounded-none border-0"
            />
          }
        />
      </div>

      <AirDrawer run={run} air={openAir} isParty={isParty} onClose={() => setOpenAirId(null)} />
    </>
  );
}

function PartyBanner({ run }: { run: AuditRunView }) {
  const message: Record<RunPhase, string> = {
    SCHEDULED: `Window 1 opens on ${formatDate(run.window1Start)}.`,
    WINDOW_1: `Window 1 is open until ${formatDate(run.window1End)}. Upload evidence for each item, then it's marked submitted.`,
    REVIEW: "The auditor is reviewing your submissions. Uploads are closed.",
    WINDOW_2: `Window 2 is open until ${formatDate(run.window2End)} for items that are pending or not complied.`,
    FINAL_REVIEW: "Final review in progress. Uploads are closed.",
    PUBLISHED: "This audit is published. Respond to any findings from the Findings page.",
  };
  const open = run.phase === "WINDOW_1" || run.phase === "WINDOW_2";
  return (
    <Alert className={open ? "border-info-border bg-info-subtle text-info" : undefined}>
      {open ? <InfoIcon /> : <LockIcon />}
      <AlertDescription className={open ? "text-info" : undefined}>{message[run.phase]}</AlertDescription>
    </Alert>
  );
}
