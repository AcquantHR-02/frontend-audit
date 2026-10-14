/**
 * Deterministic demo history so dashboards and reports have data on first load:
 * published July 2026 runs for every vendor-unit pair (mirrors spec §5.2), May/June history
 * for a few vendors (trends), and a few runs in progress for the current cycle.
 */
import type { AuditItemResult, AuditRun, ChecklistItem, ComplianceStatus, Finding } from "@/types/domain";

interface Inputs {
  vendorUnitAssignments: { vendorId: string; peUnitId: string }[];
  vendorChecklistAssignments: { vendorId: string; peUnitId: string; checklistItemIds: string[] }[];
  checklistItems: ChecklistItem[];
  acts: { id: string; shortName: string }[];
}

/** mulberry32 — tiny seeded PRNG so the demo data is identical on every reset. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const AUDITOR = "usr-auditor";

export function generateDemoRuns({ vendorUnitAssignments, vendorChecklistAssignments, checklistItems, acts }: Inputs) {
  const random = rng(20260714);
  const runs: AuditRun[] = [];
  const airs: AuditItemResult[] = [];
  const findings: Finding[] = [];
  let sequence = 0;

  const now = new Date();
  const thisMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0));

  function addRun(
    vendorId: string,
    peUnitId: string,
    month: { start: string; end: string },
    windows: { w1Start: string; w1End: string; execEnd: string },
    state: { published?: string; reviewStart?: string; stampShare?: number; ncRate: number; naRate: number },
  ) {
    const version = vendorChecklistAssignments.find((v) => v.vendorId === vendorId && v.peUnitId === peUnitId);
    if (!version) return;
    sequence += 1;
    const year = month.end.slice(0, 4);
    const createdAt = `${windows.w1Start}T04:00:00Z`;
    const audit = { createdAt, createdBy: AUDITOR, updatedAt: state.published ?? createdAt, updatedBy: AUDITOR };
    const run: AuditRun = {
      id: `run-demo-${sequence}`,
      code: `AR-${year}-${String(sequence).padStart(4, "0")}`,
      auditType: "VENDOR",
      vendorId,
      peId: null,
      triggerOccasion: null,
      peUnitId,
      activityPeriodStart: month.start,
      activityPeriodEnd: month.end,
      executionWindowStart: windows.w1Start,
      executionWindowEnd: windows.execEnd,
      window1Start: windows.w1Start,
      window1End: windows.w1End,
      reviewStart: state.reviewStart ?? null,
      window2Start: null,
      window2End: null,
      finalReviewStart: state.published ? windows.w1End : null,
      publishedAt: state.published ?? null,
      publishedBy: state.published ? AUDITOR : null,
      score: { complied: 0, notComplied: 0, notApplicable: 0, pending: 0, assignedTotal: 0 },
      ...audit,
    };
    runs.push(run);

    version.checklistItemIds.forEach((itemId, index) => {
      const item = checklistItems.find((i) => i.id === itemId);
      if (!item) return;
      const stamped = state.published || random() < (state.stampShare ?? 0);
      const r = random();
      const status: ComplianceStatus | null = !stamped
        ? null
        : r < state.ncRate
          ? "NOT_COMPLIED"
          : r < state.ncRate + state.naRate
            ? "NOT_APPLICABLE"
            : "COMPLIED";
      const air: AuditItemResult = {
        id: `air-demo-${sequence}-${index}`,
        runId: run.id,
        checklistItemId: item.id,
        peChecklistItemId: null,
        descriptionSnapshot: item.description,
        cadenceSnapshot: item.cadence,
        actNameSnapshot: acts.find((a) => a.id === item.actId)?.shortName ?? "—",
        periodStart: item.cadence === "PERIODIC" ? month.start : null,
        periodEnd: item.cadence === "PERIODIC" ? month.end : null,
        dueDate: null,
        submissionStatus: status ? "REVIEWED" : random() < 0.4 ? "SUBMITTED" : "PENDING",
        complianceStatus: status,
        auditRemarks:
          status === "NOT_COMPLIED"
            ? "Not filed for the period; no evidence produced at the site visit."
            : status === "NOT_APPLICABLE"
              ? "No event in the period (no new hires / no accidents)."
              : status
                ? "Verified against originals at the site visit."
                : null,
        isCarriedForward: false,
        evidenceCount: 0,
        ...audit,
      };
      airs.push(air);
      if (state.published && status === "NOT_COMPLIED") {
        findings.push({
          id: `fnd-demo-${air.id}`,
          airId: air.id,
          status: random() < 0.35 ? "RESOLVED" : "OPEN",
          remarks: null,
          createdAt: state.published,
          createdBy: AUDITOR,
          updatedAt: state.published,
          updatedBy: AUDITOR,
        });
      }
    });
  }

  // July 2026 — published for every pair (≈1–2% NC, ≈37% NA, like spec §5.3).
  for (const a of vendorUnitAssignments) {
    addRun(
      a.vendorId,
      a.peUnitId,
      { start: "2026-07-01", end: "2026-07-31" },
      { w1Start: "2026-08-01", w1End: "2026-08-10", execEnd: "2026-08-20" },
      {
        published: "2026-08-15T10:00:00Z",
        ncRate: 0.015,
        naRate: 0.37,
      },
    );
  }

  // May & June — first unit of six vendors, slightly weaker compliance (trend improves).
  const history = ["ven-bellfast", "ven-manpro", "ven-uniq", "ven-asa", "ven-yashas", "ven-kps"];
  const firstUnit = (vendorId: string) => vendorUnitAssignments.find((a) => a.vendorId === vendorId)?.peUnitId;
  for (const [month, published, nc] of [
    [{ start: "2026-05-01", end: "2026-05-31" }, "2026-06-15T10:00:00Z", 0.06],
    [{ start: "2026-06-01", end: "2026-06-30" }, "2026-07-15T10:00:00Z", 0.035],
  ] as const) {
    for (const vendorId of history) {
      const unit = firstUnit(vendorId);
      if (unit)
        addRun(
          vendorId,
          unit,
          month,
          { w1Start: addDaysIso(month.end, 1), w1End: addDaysIso(month.end, 10), execEnd: addDaysIso(month.end, 20) },
          { published, ncRate: nc, naRate: 0.35 },
        );
    }
  }

  // Current cycle (previous month's activity) — in progress. Avoids pairs used by automated tests.
  const prev = { start: iso(prevMonthStart), end: iso(prevMonthEnd) };
  const w1Start = iso(thisMonth);
  const w1End = addDaysIso(w1Start, 19);
  for (const [vendorId, review] of [
    ["ven-manpro", false],
    ["ven-uniq", false],
    ["ven-asa", true],
    ["ven-yashas", true],
  ] as const) {
    const unit = firstUnit(vendorId);
    if (unit) {
      addRun(
        vendorId,
        unit,
        prev,
        { w1Start, w1End, execEnd: addDaysIso(w1Start, 29) },
        {
          reviewStart: review ? iso(now) : undefined,
          stampShare: review ? 0.5 : 0,
          ncRate: 0.04,
          naRate: 0.35,
        },
      );
    }
  }

  return { runs, airs, findings };
}

function addDaysIso(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
