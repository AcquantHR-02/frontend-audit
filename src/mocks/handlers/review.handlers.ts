import { http, HttpResponse } from "msw";
import { can, Permission } from "@/lib/auth";
import {
  addDays,
  bulkStampBlocker,
  canAuditorStamp,
  canAuditorUpload,
  canPartyUpload,
  deriveRunPhase,
  evaluateEndOfReview,
  MAX_BULK_STAMP,
  needsValidTo,
  publishCheck,
  resolveCoveringVersion,
  validateEvidence,
} from "@/lib/domain";
import type { AuditItemResult, AuditRun, ComplianceStatus, EvidenceRecord, StoredFile, User } from "@/types/domain";
import { logEvent } from "../audit-log";
import { auditorRecipients, notify } from "../notifications";
import { requireUser } from "../crud";
import { db, persist } from "../db";
import { apiUrl, errorResponse, networkDelay, newId, nowIso, todayIso } from "../utils";
import { toRunView, visibleTo } from "./audit-runs.handlers";

const STATUSES: ComplianceStatus[] = ["COMPLIED", "NOT_COMPLIED", "NOT_APPLICABLE"];

/** The audited party of this run (§18: vendor users on vendor audits, PE users on their own PE audits). */
const isAuditedParty = (user: User, run: AuditRun) =>
  (run.auditType === "VENDOR" && user.role === "VENDOR_USER" && user.vendorId === run.vendorId) ||
  (run.auditType === "PE" && user.role === "PE_USER" && user.peId === run.peId);

const phaseOf = (run: AuditRun) => deriveRunPhase(run, todayIso());

function loadAir(id: unknown) {
  const air = db.airs.find((a) => a.id === id);
  const run = air && db.auditRuns.find((r) => r.id === air.runId);
  return air && run ? { air, run } : null;
}

const latestEvidence = (airId: string) =>
  db.evidence
    .filter((e) => e.airId === airId && e.isActive)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];

function applyStamp(air: AuditItemResult, user: User, complianceStatus: ComplianceStatus, auditRemarks: string) {
  Object.assign(air, {
    complianceStatus,
    auditRemarks: auditRemarks.trim(),
    submissionStatus: "REVIEWED",
    updatedAt: nowIso(),
    updatedBy: user.id,
  });
}

function touch(run: AuditRun, user: User) {
  run.updatedAt = nowIso();
  run.updatedBy = user.id;
}

/** Periodic items on the run's checklist version that got zero AIRs (§20 S2). */
function periodicItemsWithoutAirs(run: AuditRun) {
  const versions: { effectiveFrom: string; effectiveTo: string | null; ids: string[] }[] =
    run.auditType === "VENDOR"
      ? db.vendorChecklistAssignments
          .filter((a) => a.vendorId === run.vendorId && a.peUnitId === run.peUnitId)
          .map((a) => ({ ...a, ids: a.checklistItemIds }))
      : db.peChecklistAssignments.filter((a) => a.peId === run.peId).map((a) => ({ ...a, ids: a.peChecklistItemIds }));
  const coverage = resolveCoveringVersion(versions, run.activityPeriodStart, run.activityPeriodEnd);
  if (!coverage.ok) return 0;
  const master = run.auditType === "VENDOR" ? db.checklistItems : db.peChecklistItems;
  const field = run.auditType === "VENDOR" ? "checklistItemId" : "peChecklistItemId";
  const airs = db.airs.filter((a) => a.runId === run.id);
  return coverage.version.ids.filter(
    (id) => master.find((i) => i.id === id)?.cadence === "PERIODIC" && !airs.some((a) => a[field] === id),
  ).length;
}

export const reviewHandlers = [
  http.get(apiUrl("/airs/:id/evidence"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_VIEW);
    if (user instanceof Response) return user;
    const loaded = loadAir(params.id);
    if (!loaded || !visibleTo(user, loaded.run)) return errorResponse(404, "Item not found.");
    const records = db.evidence
      .filter((e) => e.airId === loaded.air.id && e.isActive)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    return HttpResponse.json(records);
  }),

  /** Path 1 (party) or Path 2 (auditor). Multipart: files[], partyRemarks, naProposedByParty. */
  http.post(apiUrl("/airs/:id/evidence"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_VIEW);
    if (user instanceof Response) return user;
    const loaded = loadAir(params.id);
    if (!loaded || !visibleTo(user, loaded.run)) return errorResponse(404, "Item not found.");
    const { air, run } = loaded;
    const phase = phaseOf(run);

    const asParty = isAuditedParty(user, run);
    const asAuditor = can(user, Permission.EVIDENCE_UPLOAD_AS_AUDITOR);
    if (asParty ? !canPartyUpload(phase, air) : !(asAuditor && canAuditorUpload(phase))) {
      return errorResponse(
        403,
        asParty ? "Uploads are closed for this item right now." : "You can't upload evidence on this run.",
        {
          code: "UPLOAD_NOT_ALLOWED",
        },
      );
    }

    const form = await request.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const naProposed = asParty && form.get("naProposedByParty") === "true";
    const partyRemarks = asParty ? String(form.get("partyRemarks") ?? "").trim() : "";
    const problem = validateEvidence({
      uploader: asParty ? "PARTY" : "AUDITOR",
      fileCount: files.length,
      naProposed,
      partyRemarks,
    });
    if (problem) return errorResponse(400, problem, { code: "VALIDATION_FAILED" });

    const stored: StoredFile[] = files.map((f) => ({
      id: newId("file"),
      fileName: f.name,
      contentType: f.type || "application/octet-stream",
      sizeBytes: f.size,
      // Mock only: object URLs last for this browser session. The backend returns signed download URLs.
      url: typeof URL.createObjectURL === "function" ? URL.createObjectURL(f) : "#",
    }));
    const record: EvidenceRecord = {
      id: newId("ev"),
      airId: air.id,
      files: stored,
      partyRemarks: asParty ? partyRemarks : null,
      naProposedByParty: naProposed,
      validTo: null,
      uploadedBy: user.id,
      uploadedByName: user.fullName,
      uploadedAt: nowIso(),
      isActive: true,
      invalidatedAt: null,
      invalidatedBy: null,
      invalidationReason: null,
      carriedForwardAt: null,
      carriedForwardFromRunId: null,
    };
    db.evidence.push(record);
    air.evidenceCount += 1;
    if (asParty && air.submissionStatus === "PENDING") air.submissionStatus = "SUBMITTED";
    logEvent(
      user,
      naProposed ? "NA_PROPOSED" : "EVIDENCE_UPLOADED",
      "AuditItem",
      air.id,
      `${run.code}: ${files.length} file(s) on "${air.descriptionSnapshot.slice(0, 60)}"`,
    );
    if (asParty) {
      const view = toRunView(run);
      notify(
        auditorRecipients(),
        {
          type: naProposed ? "NA_PROPOSED" : "EVIDENCE_SUBMITTED",
          title: naProposed ? `NA proposed on ${run.code}` : `Evidence submitted on ${run.code}`,
          body: `${view.partyName} · ${view.unitCode}: "${air.descriptionSnapshot}"`,
          href: `/audit-runs/${run.id}`,
        },
        user.id,
      );
    }
    air.updatedAt = nowIso();
    air.updatedBy = user.id;
    persist();
    return HttpResponse.json(record, { status: 201 });
  }),

  /** Auditor stamps C / NA / NC with mandatory remarks (§6 Step 3b); re-stamps allowed until publish. */
  http.patch(apiUrl("/airs/:id/review"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_REVIEW);
    if (user instanceof Response) return user;
    const loaded = loadAir(params.id);
    if (!loaded) return errorResponse(404, "Item not found.");
    const { air, run } = loaded;
    if (!canAuditorStamp(phaseOf(run))) {
      return errorResponse(409, "Items can be stamped only during review.", { code: "NOT_IN_REVIEW" });
    }
    const body = (await request.json()) as {
      complianceStatus: ComplianceStatus;
      auditRemarks: string;
      validTo?: string | null;
    };
    const errors: Record<string, string> = {};
    if (!STATUSES.includes(body.complianceStatus)) errors.complianceStatus = "Select a status";
    if (!body.auditRemarks?.trim()) errors.auditRemarks = "Audit remarks are required for every item";
    const latest = latestEvidence(air.id);
    if (needsValidTo(air.cadenceSnapshot, !!latest) && !body.validTo)
      errors.validTo = "Enter the certificate's valid-to date";
    if (Object.keys(errors).length) {
      return errorResponse(400, Object.values(errors)[0], { code: "VALIDATION_FAILED", fieldErrors: errors });
    }
    if (latest && needsValidTo(air.cadenceSnapshot, true)) latest.validTo = body.validTo!;
    applyStamp(air, user, body.complianceStatus, body.auditRemarks);
    logEvent(
      user,
      "ITEM_STAMPED",
      "AuditItem",
      air.id,
      `${run.code}: stamped ${body.complianceStatus} on "${air.descriptionSnapshot.slice(0, 60)}"`,
    );
    persist();
    return HttpResponse.json(air);
  }),

  /**
   * Bulk stamp: one status + one remark on many items of a run. Items that need a per-item
   * valid-to date are skipped (and reported) rather than failing the whole request.
   */
  http.post(apiUrl("/audit-runs/:id/bulk-review"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_REVIEW);
    if (user instanceof Response) return user;
    const run = db.auditRuns.find((r) => r.id === params.id);
    if (!run) return errorResponse(404, "Audit run not found.");
    if (!canAuditorStamp(phaseOf(run))) {
      return errorResponse(409, "Items can be stamped only during review.", { code: "NOT_IN_REVIEW" });
    }
    const body = (await request.json()) as {
      airIds?: string[];
      complianceStatus: ComplianceStatus;
      auditRemarks: string;
    };
    const ids = [...new Set(body.airIds ?? [])];
    const errors: Record<string, string> = {};
    if (ids.length === 0) errors.airIds = "Select at least one item";
    if (ids.length > MAX_BULK_STAMP) errors.airIds = `Stamp at most ${MAX_BULK_STAMP} items at a time`;
    if (!STATUSES.includes(body.complianceStatus)) errors.complianceStatus = "Select a status";
    if (!body.auditRemarks?.trim()) errors.auditRemarks = "Audit remarks are required for every item";
    if (Object.keys(errors).length) {
      return errorResponse(400, Object.values(errors)[0], { code: "VALIDATION_FAILED", fieldErrors: errors });
    }

    const stamped: string[] = [];
    const skipped: { airId: string; reason: string }[] = [];
    for (const id of ids) {
      const air = db.airs.find((a) => a.id === id && a.runId === run.id);
      if (!air) {
        skipped.push({ airId: id, reason: "Not an item of this run." });
        continue;
      }
      const blocker = bulkStampBlocker(air, !!latestEvidence(air.id));
      if (blocker) {
        skipped.push({ airId: id, reason: blocker });
        continue;
      }
      applyStamp(air, user, body.complianceStatus, body.auditRemarks);
      stamped.push(id);
    }
    if (stamped.length) {
      logEvent(
        user,
        "ITEMS_BULK_STAMPED",
        "AuditRun",
        run.id,
        `${run.code}: stamped ${stamped.length} item(s) ${body.complianceStatus}${skipped.length ? `, ${skipped.length} skipped` : ""}`,
      );
      touch(run, user);
      persist();
    }
    return HttpResponse.json({ stamped, skipped });
  }),

  /* ---------- Phase transitions (§4) ---------- */
  http.post(apiUrl("/audit-runs/:id/start-review"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_REVIEW);
    if (user instanceof Response) return user;
    const run = db.auditRuns.find((r) => r.id === params.id);
    if (!run) return errorResponse(404, "Audit run not found.");
    if (!["SCHEDULED", "WINDOW_1"].includes(phaseOf(run))) return errorResponse(409, "Review has already started.");
    run.reviewStart = todayIso();
    touch(run, user);
    logEvent(user, "REVIEW_STARTED", "AuditRun", run.id, `${run.code}: Window 1 closed, review started`);
    persist();
    return HttpResponse.json(toRunView(run));
  }),

  http.post(apiUrl("/audit-runs/:id/end-review"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_REVIEW);
    if (user instanceof Response) return user;
    const run = db.auditRuns.find((r) => r.id === params.id);
    if (!run) return errorResponse(404, "Audit run not found.");
    if (phaseOf(run) !== "REVIEW" || run.window2Start)
      return errorResponse(409, "Review can't be ended from this phase.");

    const evaluation = evaluateEndOfReview(db.airs.filter((a) => a.runId === run.id));
    if (!evaluation.needsWindow2) {
      run.finalReviewStart = todayIso();
    } else {
      const { window2Start, window2End } = (await request.json().catch(() => ({}))) as {
        window2Start?: string;
        window2End?: string;
      };
      const today = todayIso();
      if (!window2Start || !window2End) {
        return errorResponse(409, "Window 2 is required: some items are pending or not complied.", {
          code: "WINDOW2_REQUIRED",
          fieldErrors: { window2Start: "Set the Window 2 dates" },
        });
      }
      if (window2Start < today || window2End < window2Start) {
        return errorResponse(400, "Window 2 must start today or later and end after it starts.", {
          fieldErrors: { window2End: "Check the Window 2 dates" },
        });
      }
      run.window2Start = window2Start;
      run.window2End = window2End;
      run.executionWindowEnd = window2End > run.executionWindowEnd ? addDays(window2End, 5) : run.executionWindowEnd;
    }
    logEvent(
      user,
      run.window2Start ? "WINDOW2_OPENED" : "REVIEW_ENDED",
      "AuditRun",
      run.id,
      run.window2Start
        ? `${run.code}: Window 2 ${run.window2Start} → ${run.window2End}`
        : `${run.code}: moved to Final review`,
    );
    touch(run, user);
    persist();
    return HttpResponse.json(toRunView(run));
  }),

  /** One Window 2 per run (§20 S1): closing it moves to Final Review; later re-stamps never reopen it. */
  http.post(apiUrl("/audit-runs/:id/close-window2"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_REVIEW);
    if (user instanceof Response) return user;
    const run = db.auditRuns.find((r) => r.id === params.id);
    if (!run) return errorResponse(404, "Audit run not found.");
    if (phaseOf(run) !== "WINDOW_2") return errorResponse(409, "Window 2 isn't open.");
    run.finalReviewStart = todayIso();
    touch(run, user);
    logEvent(user, "WINDOW2_CLOSED", "AuditRun", run.id, `${run.code}: Window 2 closed`);
    persist();
    return HttpResponse.json(toRunView(run));
  }),

  http.get(apiUrl("/audit-runs/:id/publish-check"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_PUBLISH);
    if (user instanceof Response) return user;
    const run = db.auditRuns.find((r) => r.id === params.id);
    if (!run) return errorResponse(404, "Audit run not found.");
    return HttpResponse.json(
      publishCheck(
        db.airs.filter((a) => a.runId === run.id),
        periodicItemsWithoutAirs(run),
      ),
    );
  }),

  /** §6 Step 5 / §14 — publish freezes the party and opens one Finding per final NC. */
  http.post(apiUrl("/audit-runs/:id/publish"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.AUDIT_RUNS_PUBLISH);
    if (user instanceof Response) return user;
    const run = db.auditRuns.find((r) => r.id === params.id);
    if (!run) return errorResponse(404, "Audit run not found.");
    if (phaseOf(run) !== "FINAL_REVIEW")
      return errorResponse(409, "Publish is available in Final Review.", { code: "NOT_IN_FINAL_REVIEW" });
    const airs = db.airs.filter((a) => a.runId === run.id);
    const check = publishCheck(airs);
    if (!check.canPublish) return errorResponse(409, check.blocking.join(" "), { code: "PUBLISH_BLOCKED" });

    const now = nowIso();
    run.publishedAt = now;
    run.publishedBy = user.id;
    touch(run, user);
    logEvent(
      user,
      "RUN_PUBLISHED",
      "AuditRun",
      run.id,
      `${run.code} published; ${check.findingsToOpen} finding(s) opened`,
    );
    for (const air of airs.filter((a) => a.complianceStatus === "NOT_COMPLIED")) {
      if (db.findings.some((f) => f.airId === air.id)) continue; // UNIQUE per AIR (§15.7)
      db.findings.push({
        id: newId("fnd"),
        airId: air.id,
        status: "OPEN",
        remarks: null,
        createdAt: now,
        createdBy: user.id,
        updatedAt: now,
        updatedBy: user.id,
      });
    }
    persist();
    return HttpResponse.json(toRunView(run));
  }),
];
