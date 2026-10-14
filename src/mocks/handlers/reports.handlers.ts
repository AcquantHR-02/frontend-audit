import { http, HttpResponse } from "msw";
import { Permission } from "@/lib/auth";
import type { AuditRunView, RunPhase, ScoreCounts } from "@/types/domain";
import { requireUser } from "../crud";
import { db } from "../db";
import { apiUrl, networkDelay, paginate } from "../utils";
import { toRunView, visibleTo } from "./audit-runs.handlers";

const empty = (): ScoreCounts => ({ complied: 0, notComplied: 0, notApplicable: 0, pending: 0, assignedTotal: 0 });
const add = (a: ScoreCounts, b: ScoreCounts): ScoreCounts => ({
  complied: a.complied + b.complied,
  notComplied: a.notComplied + b.notComplied,
  notApplicable: a.notApplicable + b.notApplicable,
  pending: a.pending + b.pending,
  assignedTotal: a.assignedTotal + b.assignedTotal,
});

/** Indian FY start (1 April) for a date. */
const fyStart = (date: Date) => {
  const y = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${y}-04-01`;
};

export const reportsHandlers = [
  /** Role-aware dashboard (§12.11): everything scoped by the same visibility rules as runs. */
  http.get(apiUrl("/dashboard"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.DASHBOARD_VIEW);
    if (user instanceof Response) return user;
    const runs = db.auditRuns.filter((r) => visibleTo(user, r)).map(toRunView);
    const runIds = new Set(runs.map((r) => r.id));
    const phases: RunPhase[] = ["SCHEDULED", "WINDOW_1", "REVIEW", "WINDOW_2", "FINAL_REVIEW", "PUBLISHED"];
    const published = runs.filter((r) => r.phase === "PUBLISHED");
    const fy = fyStart(new Date());

    const partyScores = new Map<string, { name: string; score: ScoreCounts }>();
    for (const r of published) {
      const key = r.vendorId ?? r.peId ?? r.id;
      const entry = partyScores.get(key) ?? { name: r.partyName, score: empty() };
      entry.score = add(entry.score, r.score);
      partyScores.set(key, entry);
    }
    const months = new Map<string, ScoreCounts>();
    for (const r of published) {
      const month = r.activityPeriodEnd.slice(0, 7);
      months.set(month, add(months.get(month) ?? empty(), r.score));
    }
    const findings = db.findings.filter((f) => runIds.has(db.airs.find((a) => a.id === f.airId)?.runId ?? ""));

    return HttpResponse.json({
      runsByPhase: Object.fromEntries(phases.map((p) => [p, runs.filter((r) => r.phase === p).length])),
      totalRuns: runs.length,
      openFindings: findings.filter((f) => f.status === "OPEN").length,
      awaitingReview: db.airs.filter((a) => runIds.has(a.runId) && a.submissionStatus === "SUBMITTED").length,
      itemsToUpload: db.airs.filter((a) => {
        const run = runs.find((r) => r.id === a.runId);
        return run && (run.phase === "WINDOW_1" || run.phase === "WINDOW_2") && a.submissionStatus === "PENDING";
      }).length,
      publishedThisFy: published.filter((r) => r.activityPeriodEnd >= fy).length,
      publishedScore: published.reduce((acc, r) => add(acc, r.score), empty()),
      partyScores: [...partyScores.values()].sort((a, b) => b.score.assignedTotal - a.score.assignedTotal).slice(0, 8),
      trend: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, score]) => ({ month, score })),
      recentRuns: [...runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    });
  }),

  /** Management score roll-up (spec §5.3): party → unit, raw counts summed, rounded once in the UI (§10). */
  http.get(apiUrl("/reports/score-rollup"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.REPORTS_VIEW);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const peId = url.searchParams.get("peId");
    const from = url.searchParams.get("from") ?? "0000-01-01";
    const to = url.searchParams.get("to") ?? "9999-12-31";
    const type = url.searchParams.get("auditType");

    const runs: AuditRunView[] = db.auditRuns
      .filter((r) => visibleTo(user, r) && r.publishedAt && (!type || r.auditType === type))
      .filter((r) => r.activityPeriodEnd >= from && r.activityPeriodEnd <= to)
      .map(toRunView)
      .filter((r) => !peId || db.peUnits.find((u) => u.id === r.peUnitId)?.peId === peId);

    const parties = new Map<
      string,
      {
        partyName: string;
        auditType: string;
        score: ScoreCounts;
        units: Map<string, { unitCode: string; unitName: string; score: ScoreCounts }>;
      }
    >();
    for (const r of runs) {
      const key = `${r.auditType}:${r.vendorId ?? r.peId}`;
      const party = parties.get(key) ?? {
        partyName: r.partyName,
        auditType: r.auditType,
        score: empty(),
        units: new Map(),
      };
      party.score = add(party.score, r.score);
      const unit = party.units.get(r.peUnitId) ?? { unitCode: r.unitCode, unitName: r.unitName, score: empty() };
      unit.score = add(unit.score, r.score);
      party.units.set(r.peUnitId, unit);
      parties.set(key, party);
    }
    const rows = [...parties.entries()]
      .map(([id, p]) => ({
        id,
        partyName: p.partyName,
        auditType: p.auditType,
        score: p.score,
        units: [...p.units.values()].sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
      }))
      .sort((a, b) => a.partyName.localeCompare(b.partyName));
    return HttpResponse.json({
      rows,
      total: rows.reduce((acc, r) => add(acc, r.score), empty()),
      runCount: runs.length,
    });
  }),

  http.get(apiUrl("/audit-trail"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_TRAIL_VIEW);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const rows = db.auditTrail.filter((e) => !action || e.action === action);
    return HttpResponse.json(paginate(rows, url, ["actorName", "summary", "action", "entityType"]));
  }),
];
