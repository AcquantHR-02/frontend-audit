import { http, HttpResponse } from "msw";
import { can, Permission } from "@/lib/auth";
import { deriveRunPhase, resolveCoveringVersion, validateRunDates } from "@/lib/domain";
import type {
  AuditItemResult,
  AuditRun,
  AuditRunView,
  ChecklistItem,
  EvidenceRecord,
  TriggerOccasion,
  User,
} from "@/types/domain";
import { logEvent } from "../audit-log";
import { requireUser, stampCreated } from "../crud";
import { db, persist } from "../db";
import { apiUrl, errorResponse, networkDelay, newId, nowIso, paginate, todayIso } from "../utils";

interface RunScope {
  auditType: "VENDOR" | "PE";
  vendorId?: string;
  peId?: string;
  peUnitId: string;
  activityPeriodStart: string;
  activityPeriodEnd: string;
}

export interface CreateRunBody extends RunScope {
  executionWindowStart: string;
  executionWindowEnd: string;
  window1Start: string;
  window1End: string;
  triggerOccasion?: TriggerOccasion;
  periodicItems: {
    checklistItemId: string;
    periods: { periodStart: string; periodEnd: string; dueDate?: string | null }[];
  }[];
}

const fail = (status: number, message: string, code: string, fieldErrors?: Record<string, string>) =>
  errorResponse(status, message, { code, fieldErrors });

/** Prior valid COMPLIED evidence for this party/unit/item (§8 carry-forward, §15.8 Mode A). */
function findCarryForward(scope: RunScope, item: ChecklistItem) {
  if (item.cadence === "PERIODIC") return null;
  const priorRuns = db.auditRuns
    .filter(
      (r) =>
        r.peUnitId === scope.peUnitId &&
        (scope.auditType === "VENDOR" ? r.vendorId === scope.vendorId : r.peId === scope.peId) &&
        r.activityPeriodEnd < scope.activityPeriodStart,
    )
    .map((r) => r.id);
  const field = scope.auditType === "VENDOR" ? "checklistItemId" : "peChecklistItemId";
  const priorAirs = db.airs.filter(
    (a) => priorRuns.includes(a.runId) && a[field] === item.id && a.complianceStatus === "COMPLIED",
  );
  const candidates = db.evidence
    .filter((e) => priorAirs.some((a) => a.id === e.airId) && e.isActive && !e.invalidatedAt)
    .filter((e) => item.cadence === "LIFETIME" || (e.validTo !== null && e.validTo >= scope.activityPeriodEnd))
    // §15.2 latest wins: ONE_TIME by validTo, LIFETIME by uploadedAt
    .sort((a, b) =>
      item.cadence === "ONE_TIME"
        ? (b.validTo ?? "").localeCompare(a.validTo ?? "")
        : b.uploadedAt.localeCompare(a.uploadedAt),
    );
  const evidence = candidates[0];
  return evidence ? { evidence, runId: db.airs.find((a) => a.id === evidence.airId)!.runId } : null;
}

/** Shared validation for preview + create: scope, §13 closure gate, §15.9 coverage. */
function resolveScope(scope: RunScope) {
  const unit = db.peUnits.find((u) => u.id === scope.peUnitId);
  if (!unit) return { error: fail(400, "Select a unit.", "VALIDATION_FAILED", { peUnitId: "Select a unit" }) };

  if (unit.closedAt && unit.closedAt.slice(0, 10) <= scope.activityPeriodEnd) {
    return {
      error: fail(
        409,
        `Unit ${unit.code} closed on ${unit.closedAt.slice(0, 10)}; the activity period extends past it.`,
        "UNIT_CLOSED",
      ),
    };
  }

  let versions: { effectiveFrom: string; effectiveTo: string | null; itemIds: string[] }[];
  let master: ChecklistItem[];
  if (scope.auditType === "VENDOR") {
    const vua = db.vendorUnitAssignments.filter((a) => a.vendorId === scope.vendorId && a.peUnitId === unit.id);
    const covered = vua.some(
      (a) =>
        a.effectiveFrom <= scope.activityPeriodStart &&
        (a.effectiveTo === null || a.effectiveTo >= scope.activityPeriodEnd),
    );
    if (!covered) {
      return {
        error: fail(
          409,
          "The vendor isn't assigned to this unit for the whole activity period.",
          "VENDOR_NOT_ASSIGNED",
        ),
      };
    }
    versions = db.vendorChecklistAssignments
      .filter((a) => a.vendorId === scope.vendorId && a.peUnitId === unit.id)
      .map((a) => ({ ...a, itemIds: a.checklistItemIds }));
    master = db.checklistItems;
  } else {
    if (unit.peId !== scope.peId)
      return { error: fail(400, "This unit doesn't belong to the selected Principal Employer.", "VALIDATION_FAILED") };
    versions = db.peChecklistAssignments
      .filter((a) => a.peId === scope.peId)
      .map((a) => ({ ...a, itemIds: a.peChecklistItemIds }));
    master = db.peChecklistItems;
  }

  const coverage = resolveCoveringVersion(versions, scope.activityPeriodStart, scope.activityPeriodEnd);
  if (!coverage.ok) return { error: fail(409, coverage.message, coverage.code) };
  const items = coverage.version.itemIds
    .map((id) => master.find((i) => i.id === id))
    .filter((i): i is ChecklistItem => !!i);
  return { unit, items };
}

export function toRunView(run: AuditRun): AuditRunView {
  const unit = db.peUnits.find((u) => u.id === run.peUnitId);
  const pe = db.principalEmployers.find((p) => p.id === unit?.peId);
  const airs = db.airs.filter((a) => a.runId === run.id);
  const count = (s: string) => airs.filter((a) => a.complianceStatus === s).length;
  return {
    ...run,
    score: {
      complied: count("COMPLIED"),
      notComplied: count("NOT_COMPLIED"),
      notApplicable: count("NOT_APPLICABLE"),
      pending: airs.filter((a) => a.complianceStatus === null).length,
      assignedTotal: airs.length,
    },
    partyName:
      run.auditType === "VENDOR" ? (db.vendors.find((v) => v.id === run.vendorId)?.name ?? "—") : (pe?.name ?? "—"),
    peName: pe?.name ?? "—",
    unitCode: unit?.code ?? "—",
    unitName: unit?.name ?? "—",
    phase: deriveRunPhase(run, todayIso()),
  };
}

/** §18 visibility: vendors see own runs; PE users see own PE audits + vendor audits at own units. */
export function visibleTo(user: User, run: AuditRun) {
  if (can(user, Permission.AUDIT_RUNS_CREATE)) return true;
  if (user.role === "VENDOR_USER") return run.vendorId === user.vendorId;
  if (user.role === "PE_USER") {
    const unit = db.peUnits.find((u) => u.id === run.peUnitId);
    return unit?.peId === user.peId;
  }
  return false;
}

export const auditRunsHandlers = [
  /** Wizard step: which items the run will get, or the blocking reason (two-tier §15.9 error). */
  http.post(apiUrl("/audit-runs/checklist-preview"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_CREATE);
    if (user instanceof Response) return user;
    const scope = (await request.json()) as RunScope;
    const resolved = resolveScope(scope);
    if ("error" in resolved) return resolved.error;
    return HttpResponse.json({
      items: resolved.items.map((item) => ({
        id: item.id,
        description: item.description,
        cadence: item.cadence,
        actShortName: db.acts.find((a) => a.id === item.actId)?.shortName ?? "—",
        willCarryForward: !!findCarryForward(scope, item),
      })),
    });
  }),

  http.post(apiUrl("/audit-runs"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_CREATE);
    if (user instanceof Response) return user;
    const body = (await request.json()) as CreateRunBody;

    const dateErrors = validateRunDates(body);
    if (Object.keys(dateErrors).length)
      return fail(400, Object.values(dateErrors)[0]!, "VALIDATION_FAILED", dateErrors);
    if (body.auditType === "PE" && !body.triggerOccasion) {
      return fail(400, "Select why this PE audit is happening.", "VALIDATION_FAILED", { triggerOccasion: "Required" });
    }

    const overlapping = db.auditRuns.some(
      (r) =>
        r.peUnitId === body.peUnitId &&
        (body.auditType === "VENDOR" ? r.vendorId === body.vendorId : r.auditType === "PE" && r.peId === body.peId) &&
        r.activityPeriodStart <= body.activityPeriodEnd &&
        body.activityPeriodStart <= r.activityPeriodEnd,
    );
    if (overlapping)
      return fail(
        409,
        "An audit run already covers part of this activity period for this party and unit.",
        "RUN_OVERLAP",
      );

    const resolved = resolveScope(body);
    if ("error" in resolved) return resolved.error;

    // PERIODIC AIRs come only from the auditor's explicit input (§20 lock #5).
    const periodicIds = new Set(resolved.items.filter((i) => i.cadence === "PERIODIC").map((i) => i.id));
    for (const p of body.periodicItems ?? []) {
      if (!periodicIds.has(p.checklistItemId))
        return fail(400, "A periodic item isn't on this run's checklist.", "VALIDATION_FAILED");
      const seen = new Set<string>();
      for (const period of p.periods) {
        const key = `${period.periodStart}:${period.periodEnd}`;
        if (period.periodEnd < period.periodStart || seen.has(key)) {
          return fail(400, "Each periodic item needs valid, distinct periods.", "VALIDATION_FAILED");
        }
        seen.add(key);
      }
    }

    const year = body.activityPeriodEnd.slice(0, 4);
    const sequence = db.auditRuns.filter((r) => r.code.includes(`-${year}-`)).length + 1;
    const now = nowIso();
    const base = {
      id: newId("run"),
      code: `AR-${year}-${String(sequence).padStart(4, "0")}`,
      peUnitId: body.peUnitId,
      activityPeriodStart: body.activityPeriodStart,
      activityPeriodEnd: body.activityPeriodEnd,
      executionWindowStart: body.executionWindowStart,
      executionWindowEnd: body.executionWindowEnd,
      window1Start: body.window1Start,
      window1End: body.window1End,
      reviewStart: null,
      window2Start: null,
      window2End: null,
      finalReviewStart: null,
      publishedAt: null,
      publishedBy: null,
      score: { complied: 0, notComplied: 0, notApplicable: 0, pending: 0, assignedTotal: 0 },
      ...stampCreated(user),
    };
    const run: AuditRun =
      body.auditType === "VENDOR"
        ? { ...base, auditType: "VENDOR", vendorId: body.vendorId!, peId: null, triggerOccasion: null }
        : { ...base, auditType: "PE", vendorId: null, peId: body.peId!, triggerOccasion: body.triggerOccasion! };

    const field = body.auditType === "VENDOR" ? "checklistItemId" : "peChecklistItemId";
    const newAir = (item: ChecklistItem, extra: Partial<AuditItemResult> = {}): AuditItemResult => ({
      id: newId("air"),
      runId: run.id,
      checklistItemId: null,
      peChecklistItemId: null,
      [field]: item.id,
      // Write-once snapshots (§7A Lock 4)
      descriptionSnapshot: item.description,
      cadenceSnapshot: item.cadence,
      actNameSnapshot: db.acts.find((a) => a.id === item.actId)?.shortName ?? "—",
      periodStart: null,
      periodEnd: null,
      dueDate: null,
      submissionStatus: "PENDING",
      complianceStatus: null,
      auditRemarks: null,
      isCarriedForward: false,
      evidenceCount: 0,
      ...stampCreated(user),
      ...extra,
    });

    const airs: AuditItemResult[] = [];
    const evidence: EvidenceRecord[] = [];
    for (const item of resolved.items) {
      if (item.cadence === "PERIODIC") {
        const periods = body.periodicItems?.find((p) => p.checklistItemId === item.id)?.periods ?? [];
        for (const period of periods) {
          airs.push(
            newAir(item, {
              periodStart: period.periodStart,
              periodEnd: period.periodEnd,
              dueDate: period.dueDate ?? null,
            }),
          );
        }
        continue;
      }
      const prior = findCarryForward(body, item);
      if (!prior) {
        airs.push(newAir(item));
        continue;
      }
      // Mode A (§15.8): new self-contained EvidenceRecord in the new run, provenance preserved.
      const air = newAir(item, {
        submissionStatus: "REVIEWED",
        complianceStatus: "COMPLIED",
        isCarriedForward: true,
        evidenceCount: 1,
        auditRemarks: `Carried forward from a prior run (evidence uploaded ${prior.evidence.uploadedAt.slice(0, 10)}).`,
      });
      airs.push(air);
      evidence.push({
        ...prior.evidence,
        id: newId("ev"),
        airId: air.id,
        carriedForwardAt: now,
        carriedForwardFromRunId: prior.runId,
      });
    }

    db.auditRuns.push(run);
    db.airs.push(...airs);
    db.evidence.push(...evidence);
    logEvent(
      user,
      "RUN_CREATED",
      "AuditRun",
      run.id,
      `Created ${run.code} with ${airs.length} items (${evidence.length} carried forward)`,
    );
    persist();
    return HttpResponse.json(toRunView(run), { status: 201 });
  }),

  http.get(apiUrl("/audit-runs"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_VIEW);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const type = url.searchParams.get("auditType");
    const phase = url.searchParams.get("phase");
    const rows = db.auditRuns
      .filter((r) => visibleTo(user, r) && (!type || r.auditType === type))
      .map(toRunView)
      .filter((r) => !phase || r.phase === phase);
    return HttpResponse.json(
      paginate(rows, url, ["code", "partyName", "unitCode", "unitName", "peName"], "createdAt,desc"),
    );
  }),

  http.get(apiUrl("/audit-runs/:id"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_VIEW);
    if (user instanceof Response) return user;
    const run = db.auditRuns.find((r) => r.id === params.id);
    if (!run || !visibleTo(user, run)) return errorResponse(404, "Audit run not found.");
    return HttpResponse.json(toRunView(run));
  }),

  http.get(apiUrl("/audit-runs/:id/items"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_VIEW);
    if (user instanceof Response) return user;
    const run = db.auditRuns.find((r) => r.id === params.id);
    if (!run || !visibleTo(user, run)) return errorResponse(404, "Audit run not found.");
    const airs = db.airs
      .filter((a) => a.runId === run.id)
      .sort(
        (a, b) =>
          a.actNameSnapshot.localeCompare(b.actNameSnapshot) ||
          (a.periodStart ?? "").localeCompare(b.periodStart ?? ""),
      );
    return HttpResponse.json(airs);
  }),
];
