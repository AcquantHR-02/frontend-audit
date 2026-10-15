"use client";

import {
  ArrowRightIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ClipboardCheckIcon,
  FolderKanbanIcon,
  PlusIcon,
  SendIcon,
  ShieldCheckIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { BarList, ComplianceRing, PhaseTiles, ScoreTrend } from "@/components/shared/charts";
import { KpiCard } from "@/components/shared/kpi-card";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan, useCurrentUser } from "@/hooks/use-current-user";
import { isAuditor, Permission } from "@/lib/auth";
import { formatScore, roleMeta, runPhaseMeta, scorecardHref, scoreInTenths } from "@/lib/domain";
import { cn, formatCount, formatDateRange } from "@/lib/utils";
import { useGetDashboardQuery, type DashboardData } from "../api/dashboard.api";
import { DeadlineList, FindingsAging, NcByAct } from "./insights";

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

const plural = (n: number, word: string) => `${formatCount(n)} ${word}${n === 1 ? "" : "s"}`;

interface Task {
  key: string;
  icon: LucideIcon;
  text: string;
  cta: string;
  href: string;
  tone: keyof typeof taskTone;
}

const taskTone = {
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  primary: "bg-primary/10 text-primary",
} as const;

/** "What should I do next?" — only actionable counts, each linking to the filtered list. */
function buildTasks(
  data: DashboardData,
  { auditor, canReview, canPublish }: { auditor: boolean; canReview: boolean; canPublish: boolean },
): Task[] {
  const tasks: Task[] = [];
  if (canReview && data.awaitingReview > 0)
    tasks.push({
      key: "review",
      icon: ClipboardCheckIcon,
      text: `${plural(data.awaitingReview, "submitted item")} awaiting review`,
      cta: "Review",
      href: "/audit-runs?phase=REVIEW",
      tone: "warning",
    });
  if (canPublish && data.runsByPhase.FINAL_REVIEW > 0)
    tasks.push({
      key: "publish",
      icon: SendIcon,
      text: `${plural(data.runsByPhase.FINAL_REVIEW, "run")} ready to publish`,
      cta: "Publish",
      href: "/audit-runs?phase=FINAL_REVIEW",
      tone: "primary",
    });
  if (!auditor && data.itemsToUpload > 0)
    tasks.push({
      key: "upload",
      icon: UploadIcon,
      text: `${plural(data.itemsToUpload, "item")} waiting for your evidence`,
      cta: "Upload",
      href: "/audit-runs",
      tone: "warning",
    });
  if (data.openFindings > 0)
    tasks.push({
      key: "findings",
      icon: CircleAlertIcon,
      text: `${plural(data.openFindings, "open finding")} ${auditor ? "to follow up" : "to remediate"}`,
      cta: auditor ? "Follow up" : "Remediate",
      href: "/findings?status=OPEN",
      tone: "danger",
    });
  return tasks;
}

function NeedsAttention({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-xs">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success/10 text-success">
          <CircleCheckIcon className="size-4" />
        </span>
        <span>
          <span className="font-medium">You&apos;re all caught up.</span>{" "}
          <span className="text-muted-foreground">Nothing is waiting on you right now.</span>
        </span>
      </div>
    );
  }
  return (
    <section aria-labelledby="attention-title" className="space-y-2">
      <h2 id="attention-title" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Needs your attention
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tasks.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              className="group flex h-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm shadow-xs transition-colors outline-none hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", taskTone[t.tone])}>
                <t.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 font-medium">{t.text}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                {t.cta}
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Mirrors the real layout so nothing jumps when data arrives. */
function OverviewSkeleton() {
  return (
    <>
      <Skeleton className="h-14" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-80" />
    </>
  );
}

interface HeroStat {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  href: string;
}

/** Brand gradient banner: greeting, date, role, primary actions and three headline numbers. */
function WelcomeHero({
  title,
  role,
  description,
  canCreate,
  stats,
}: {
  title: string;
  role: string;
  description: string;
  canCreate: boolean;
  stats?: HeroStat[];
}) {
  return (
    <section className="relative isolate animate-rise overflow-hidden rounded-2xl bg-hero-gradient px-5 py-6 text-white shadow-md sm:px-7 sm:py-7">
      {/* Decorative rings and a one-time sheen: purely visual. */}
      <div
        aria-hidden
        className="absolute -top-24 -right-16 -z-10 size-72 animate-drift rounded-full border-[28px] border-white/[0.06]"
      />
      <div
        aria-hidden
        className="absolute -right-4 -bottom-28 -z-10 size-56 animate-drift rounded-full border-[18px] border-white/[0.05] [animation-delay:-7s]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <CalendarDaysIcon className="size-3.5" aria-hidden />
            {format(new Date(), "EEEE, d MMMM yyyy")}
            <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium text-white">{role}</span>
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
              </span>
              Live
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
          <p className="max-w-2xl text-sm text-white/75">{description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {canCreate && (
              <Button asChild className="bg-white text-[#0c2656] shadow-sm hover:bg-white/90">
                <Link href="/audit-runs/new">
                  <PlusIcon /> New audit run
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/reports">
                <BarChart3Icon /> Reports
              </Link>
            </Button>
          </div>
        </div>
        {stats && (
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            {stats.map((stat, i) => (
              <Link
                key={stat.label}
                href={stat.href}
                style={{ "--delay": `${150 + i * 90}ms` } as CSSProperties}
                className="group min-w-0 animate-rise rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm transition-colors outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 sm:min-w-32 sm:px-4 sm:py-3"
              >
                <dt className="truncate text-[11px] font-medium tracking-wide text-white/70 uppercase">{stat.label}</dt>
                <dd className="mt-0.5 text-xl font-semibold tracking-tight tabular sm:text-2xl">
                  <AnimatedNumber value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                </dd>
              </Link>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export function Overview() {
  const user = useCurrentUser();
  const router = useRouter();
  const canCreate = useCan(Permission.AUDIT_RUNS_CREATE);
  const canReview = useCan(Permission.AUDIT_RUNS_REVIEW);
  const canPublish = useCan(Permission.AUDIT_RUNS_PUBLISH);
  const { data, isLoading } = useGetDashboardQuery();
  if (!user) return null;
  const auditor = isAuditor(user);

  return (
    <>
      <WelcomeHero
        title={`${greeting()}, ${user.fullName.split(" ")[0]}`}
        role={roleMeta[user.role].label}
        description={descriptions[user.role]}
        canCreate={canCreate}
        stats={
          data && [
            {
              label: "Compliance",
              value: (scoreInTenths(data.publishedScore) ?? 0) / 10,
              decimals: 1,
              suffix: "%",
              href: "/reports",
            },
            auditor
              ? {
                  label: "In progress",
                  value: data.totalRuns - data.runsByPhase.PUBLISHED,
                  href: "/audit-runs",
                }
              : { label: "To upload", value: data.itemsToUpload, href: "/audit-runs" },
            { label: "Open findings", value: data.openFindings, href: "/findings?status=OPEN" },
          ]
        }
      />

      {isLoading || !data ? (
        <OverviewSkeleton />
      ) : (
        <OverviewContent
          data={data}
          auditor={auditor}
          partyView={auditor || user.role === "PE_USER"}
          tasks={buildTasks(data, { auditor, canReview, canPublish })}
          onOpenRun={(id) => router.push(`/audit-runs/${id}`)}
        />
      )}
    </>
  );
}

function OverviewContent({
  data,
  auditor,
  partyView,
  tasks,
  onOpenRun,
}: {
  data: DashboardData;
  auditor: boolean;
  partyView: boolean;
  tasks: Task[];
  onOpenRun: (id: string) => void;
}) {
  const inProgress = data.totalRuns - data.runsByPhase.PUBLISHED;
  const score = data.publishedScore;

  // Each block rises in a little after the previous one.
  const rise = (step: number) => ({
    className: "animate-rise",
    style: { "--delay": `${step * 80}ms` } as CSSProperties,
  });

  return (
    <>
      <div {...rise(1)}>
        <NeedsAttention tasks={tasks} />
      </div>

      <div {...rise(2)} className="grid animate-rise grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Audit runs"
          icon={<FolderKanbanIcon />}
          value={<AnimatedNumber value={data.totalRuns} />}
          hint={`${formatCount(inProgress)} in progress · ${formatCount(data.runsByPhase.PUBLISHED)} published`}
          progress={data.runsByPhase.PUBLISHED / Math.max(1, data.totalRuns)}
          href="/audit-runs"
        />
        {auditor ? (
          <KpiCard
            label="Awaiting review"
            icon={<ClipboardCheckIcon />}
            value={<AnimatedNumber value={data.awaitingReview} />}
            tone={data.awaitingReview ? "warning" : undefined}
            hint="submitted items"
            href="/audit-runs?phase=REVIEW"
          />
        ) : (
          <KpiCard
            label="Items to upload"
            icon={<UploadIcon />}
            value={<AnimatedNumber value={data.itemsToUpload} />}
            tone={data.itemsToUpload ? "warning" : undefined}
            hint="in open windows"
            href="/audit-runs"
          />
        )}
        <KpiCard
          label="Published this FY"
          icon={<ShieldCheckIcon />}
          value={<AnimatedNumber value={data.publishedThisFy} />}
          tone="success"
          hint="completed audits"
          href="/audit-runs?phase=PUBLISHED"
        />
        <KpiCard
          label="Open findings"
          icon={<CircleAlertIcon />}
          value={<AnimatedNumber value={data.openFindings} />}
          tone={data.openFindings ? "danger" : undefined}
          hint={data.openFindings ? "need action" : "none open"}
          href="/findings?status=OPEN"
        />
      </div>

      <div {...rise(3)} className="grid animate-rise gap-4 xl:grid-cols-2">
        <Panel title="Compliance score" action={<span className="text-xs text-muted-foreground">Published runs</span>}>
          <ComplianceRing score={score} />
          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground tabular">
            (Complied {formatCount(score.complied)} + NA {formatCount(score.notApplicable)}) ÷{" "}
            {formatCount(score.assignedTotal)} items = {formatScore(score)}
          </p>
        </Panel>
        <Panel
          title="Audit runs by phase"
          action={
            <span className="text-xs text-muted-foreground">{formatCount(data.totalRuns)} runs · click to open</span>
          }
        >
          <PhaseTiles counts={data.runsByPhase} total={data.totalRuns} />
        </Panel>
      </div>

      <div {...rise(4)} className="grid animate-rise gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Upcoming deadlines" action={<span className="text-xs text-muted-foreground">Next 30 days</span>}>
          <DeadlineList deadlines={data.deadlines} />
        </Panel>
        <Panel
          title="Not complied by Act"
          action={<span className="text-xs text-muted-foreground">Published runs</span>}
        >
          <NcByAct rows={data.ncByAct} />
        </Panel>
        <Panel
          title="Open findings by age"
          action={
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/findings?status=OPEN">
                View <ArrowRightIcon />
              </Link>
            </Button>
          }
        >
          <FindingsAging aging={data.findingsAging} openFindings={data.openFindings} />
        </Panel>
      </div>

      <div {...rise(5)} className="grid animate-rise gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="Score trend by activity month">
          {data.trend.length > 1 ? (
            <ScoreTrend data={data.trend} />
          ) : (
            <p className="text-[13px] text-muted-foreground">Trends appear after two or more months are published.</p>
          )}
        </Panel>
        <Panel
          title={partyView ? "Score by audited party" : "Score by month"}
          action={partyView && <span className="text-xs text-muted-foreground">Lowest first</span>}
        >
          {/* Long lists scroll inside the panel; weakest parties first = where to look next. */}
          <div className="max-h-64 overflow-y-auto overscroll-contain fade-bottom pr-1 pb-6">
            <BarList
              valueLabel={partyView ? "Compliance score by party" : "Compliance score by month"}
              rows={
                partyView
                  ? [...data.partyScores]
                      .sort((x, y) => (scoreInTenths(x.score) ?? 0) - (scoreInTenths(y.score) ?? 0))
                      .map((p) => ({
                        label: p.name,
                        value: (scoreInTenths(p.score) ?? 0) / 10,
                        display: formatScore(p.score),
                        href: scorecardHref(p.auditType, p.id),
                      }))
                  : data.trend.map((t) => ({
                      label: format(parseISO(`${t.month}-01`), "MMM yyyy"),
                      value: (scoreInTenths(t.score) ?? 0) / 10,
                      display: formatScore(t.score),
                    }))
              }
            />
          </div>
        </Panel>
      </div>

      <Panel
        {...rise(6)}
        title="Recent audit runs"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/audit-runs">View all</Link>
          </Button>
        }
      >
        <div className="-mx-(--card-spacing) -my-4">
          <Table containerClassName="max-h-[22rem] overflow-auto overscroll-contain">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-(--card-spacing)">Run</TableHead>
                <TableHead>Audited party</TableHead>
                <TableHead>Activity period</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead className="pr-(--card-spacing) text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentRuns.map((run) => (
                <TableRow key={run.id} className="cursor-pointer" onClick={() => onOpenRun(run.id)}>
                  <TableCell className="pl-(--card-spacing) font-mono text-xs">
                    {/* Real link: keyboard focus, middle-click and "open in new tab" work. */}
                    <Link
                      href={`/audit-runs/${run.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {run.code}
                    </Link>
                  </TableCell>
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
                  <TableCell className="pr-(--card-spacing) text-right font-medium tabular">
                    {formatScore(run.score)}
                  </TableCell>
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
  );
}
