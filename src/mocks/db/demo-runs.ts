/**
 * Deterministic demo history so dashboards and reports have data on first load:
 * published July 2026 runs for every vendor-unit pair (mirrors spec §5.2), May/June history
 * for a few vendors (trends), and a few runs in progress for the current cycle.
 */
import type {
  AuditItemResult,
  AuditRun,
  ChecklistItem,
  ComplianceStatus,
  EvidenceRecord,
  Finding,
  StoredFile,
} from "@/types/domain";
import { fileUrl } from "../files";

interface Inputs {
  vendorUnitAssignments: { vendorId: string; peUnitId: string }[];
  vendorChecklistAssignments: { vendorId: string; peUnitId: string; checklistItemIds: string[] }[];
  checklistItems: ChecklistItem[];
  acts: { id: string; shortName: string }[];
  vendors: { id: string; name: string }[];
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
/** The one seeded vendor login; other vendors' uploads are attributed to their site team. */
const VENDOR_LOGINS: Record<string, { id: string; name: string }> = {
  "ven-rathna": { id: "usr-vendor", name: "Suresh Kumar" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Wage slips issued to workmen (Form XIX)" + 2026-09 → "Form-XIX-Sep-2026". */
function evidenceName(description: string, month: string) {
  const form = /\((Form [^)]+)\)/.exec(description)?.[1];
  const words = (form ?? description.split(/\s+/).slice(0, 3).join(" ")).replace(/[^A-Za-z0-9 ]/g, "");
  return `${words.trim().replace(/\s+/g, "-")}-${MONTHS[Number(month.slice(5, 7)) - 1]}-${month.slice(0, 4)}`;
}

export function generateDemoRuns({
  vendorUnitAssignments,
  vendorChecklistAssignments,
  checklistItems,
  acts,
  vendors,
}: Inputs) {
  const random = rng(20260714);
  const runs: AuditRun[] = [];
  const airs: AuditItemResult[] = [];
  const findings: Finding[] = [];
  const evidence: EvidenceRecord[] = [];
  // Separate stream so adding evidence never changes the seeded statuses and findings.
  const evidenceRandom = rng(20260901);
  let sequence = 0;
  const today = iso(new Date());

  /**
   * What the vendor would have uploaded in Window 1: files for submitted / complied items,
   * an NA proposal for some not-applicable ones, patchy evidence for some not-complied ones.
   */
  function addEvidence(air: AuditItemResult, vendorId: string, w1Start: string, w1End: string) {
    const status = air.complianceStatus;
    const roll = evidenceRandom();
    const proposeNa = status === "NOT_APPLICABLE" && roll < 0.5;
    const hasFiles =
      air.submissionStatus === "SUBMITTED" || status === "COMPLIED" || (status === "NOT_COMPLIED" && roll < 0.35);
    if (!hasFiles && !proposeNa) return;

    const lastDay = w1End < today ? w1End : today;
    const span = Math.max(0, Math.round((Date.parse(lastDay) - Date.parse(w1Start)) / 86_400_000));
    const day = addDaysIso(w1Start, Math.floor(evidenceRandom() * (span + 1)));
    const uploader = VENDOR_LOGINS[vendorId] ?? {
      id: `party-${vendorId}`,
      name: `${vendors.find((v) => v.id === vendorId)?.name ?? "Vendor"} site team`,
    };
    const base = evidenceName(air.descriptionSnapshot, air.periodStart ?? w1Start);
    const fileCount = proposeNa ? 0 : evidenceRandom() < 0.3 ? 2 : 1;
    const files: StoredFile[] = Array.from({ length: fileCount }, (_, n) => {
      const photo = n === 1 || evidenceRandom() < 0.2;
      return {
        // "file-demo-" ids have no stored bytes; the files handler renders a sample document.
        id: `file-demo-${air.id}-${n}`,
        fileName: photo ? `${base}-photo${n ? `-${n + 1}` : ""}.svg` : `${base}.pdf`,
        contentType: photo ? "image/svg+xml" : "application/pdf",
        sizeBytes: photo
          ? 18_000 + Math.floor(evidenceRandom() * 40_000)
          : 60_000 + Math.floor(evidenceRandom() * 240_000),
        url: fileUrl(`file-demo-${air.id}-${n}`),
      };
    });
    evidence.push({
      id: `ev-demo-${air.id}`,
      airId: air.id,
      files,
      partyRemarks: proposeNa
        ? "No such event during the period, so this doesn't apply."
        : fileCount > 1
          ? "Register copy and site photo attached."
          : "Copy attached for the period.",
      naProposedByParty: proposeNa,
      validTo: status && air.cadenceSnapshot === "ONE_TIME" && files.length ? addDaysIso(day, 365) : null,
      uploadedBy: uploader.id,
      uploadedByName: uploader.name,
      uploadedAt: `${day}T${String(9 + Math.floor(evidenceRandom() * 8)).padStart(2, "0")}:${String(Math.floor(evidenceRandom() * 60)).padStart(2, "0")}:00Z`,
      isActive: true,
      invalidatedAt: null,
      invalidatedBy: null,
      invalidationReason: null,
      carriedForwardAt: null,
      carriedForwardFromRunId: null,
    });
    air.evidenceCount = 1;
  }

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
      addEvidence(air, vendorId, windows.w1Start, windows.w1End);
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

  return { runs, airs, findings, evidence };
}

function addDaysIso(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
