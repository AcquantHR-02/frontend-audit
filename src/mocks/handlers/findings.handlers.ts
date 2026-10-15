import { http, HttpResponse } from "msw";
import { can, Permission } from "@/lib/auth";
import type { Finding, FindingDetail, FindingStatus, FindingView, User } from "@/types/domain";
import { logEvent } from "../audit-log";
import { storeUpload } from "../files";
import { auditorRecipients, notify, partyRecipients } from "../notifications";
import { requireUser } from "../crud";
import { db, persist } from "../db";
import { apiUrl, errorResponse, networkDelay, newId, nowIso, paginate } from "../utils";
import { visibleTo } from "./audit-runs.handlers";

function resolve(finding: Finding) {
  const air = db.airs.find((a) => a.id === finding.airId);
  const run = air && db.auditRuns.find((r) => r.id === air.runId);
  return air && run ? { air, run } : null;
}

function toView(finding: Finding): FindingView | null {
  const ctx = resolve(finding);
  if (!ctx) return null;
  const { air, run } = ctx;
  const unit = db.peUnits.find((u) => u.id === run.peUnitId);
  const pe = db.principalEmployers.find((p) => p.id === unit?.peId);
  const attachments = db.findingAttachments.filter((a) => a.findingId === finding.id);
  return {
    ...finding,
    runId: run.id,
    runCode: run.code,
    auditType: run.auditType,
    partyName:
      run.auditType === "VENDOR" ? (db.vendors.find((v) => v.id === run.vendorId)?.name ?? "—") : (pe?.name ?? "—"),
    peName: pe?.name ?? "—",
    unitCode: unit?.code ?? "—",
    unitName: unit?.name ?? "—",
    actName: air.actNameSnapshot,
    requirement: air.descriptionSnapshot,
    periodStart: air.periodStart,
    periodEnd: air.periodEnd,
    auditRemarks: air.auditRemarks,
    attachmentCount: attachments.length,
    lastRemediationAt:
      attachments
        .map((a) => a.uploadedAt)
        .sort()
        .at(-1) ?? null,
  };
}

/** §14 — the audited party of the finding's run may upload remediation while the finding is OPEN. */
function isParty(user: User, finding: Finding) {
  const ctx = resolve(finding);
  if (!ctx) return false;
  const { run } = ctx;
  return (
    (run.auditType === "VENDOR" && user.role === "VENDOR_USER" && user.vendorId === run.vendorId) ||
    (run.auditType === "PE" && user.role === "PE_USER" && user.peId === run.peId)
  );
}

export const canSee = (user: User, finding: Finding) => {
  const ctx = resolve(finding);
  return !!ctx && visibleTo(user, ctx.run);
};

export const findingsHandlers = [
  http.get(apiUrl("/findings"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.FINDINGS_VIEW);
    if (user instanceof Response) return user;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("auditType");
    const runId = url.searchParams.get("runId");
    // Opened at least N days ago (aging views, e.g. "open over 60 days").
    const minAge = Number(url.searchParams.get("minAgeDays") ?? 0);
    const openedBy = minAge > 0 ? new Date(Date.now() - minAge * 86_400_000).toISOString() : null;
    const rows = db.findings
      .filter((f) => canSee(user, f) && (!status || f.status === status))
      .filter((f) => !openedBy || f.createdAt <= openedBy)
      .map(toView)
      .filter((f): f is FindingView => !!f && (!type || f.auditType === type) && (!runId || f.runId === runId));
    return HttpResponse.json(
      paginate(rows, url, ["runCode", "partyName", "unitCode", "requirement", "actName"], "createdAt,desc"),
    );
  }),

  http.get(apiUrl("/findings/summary"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.FINDINGS_VIEW);
    if (user instanceof Response) return user;
    const visible = db.findings.filter((f) => canSee(user, f));
    return HttpResponse.json({
      open: visible.filter((f) => f.status === "OPEN").length,
      resolved: visible.filter((f) => f.status === "RESOLVED").length,
      awaitingReview: visible.filter(
        (f) => f.status === "OPEN" && db.findingAttachments.some((a) => a.findingId === f.id),
      ).length,
    });
  }),

  http.get(apiUrl("/findings/:id"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.FINDINGS_VIEW);
    if (user instanceof Response) return user;
    const finding = db.findings.find((f) => f.id === params.id);
    const view = finding && canSee(user, finding) ? toView(finding) : null;
    if (!view) return errorResponse(404, "Finding not found.");
    const detail: FindingDetail = {
      ...view,
      attachments: db.findingAttachments
        .filter((a) => a.findingId === view.id)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    };
    return HttpResponse.json(detail);
  }),

  /** Own evidence stream (§14): never written back to the published run. */
  http.post(apiUrl("/findings/:id/attachments"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.FINDINGS_VIEW);
    if (user instanceof Response) return user;
    const finding = db.findings.find((f) => f.id === params.id);
    if (!finding || !canSee(user, finding)) return errorResponse(404, "Finding not found.");

    const party = isParty(user, finding) && can(user, Permission.FINDINGS_REMEDIATE);
    const auditor = can(user, Permission.FINDINGS_MANAGE);
    if (!party && !auditor) return errorResponse(403, "You can't add remediation to this finding.");
    if (party && finding.status !== "OPEN") {
      return errorResponse(409, "This finding is resolved, so remediation is closed.", { code: "FINDING_RESOLVED" });
    }

    const form = await request.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const remarks = String(form.get("remarks") ?? "").trim();
    if (files.length < 1 || files.length > 3)
      return errorResponse(400, "Attach 1 to 3 files.", { code: "VALIDATION_FAILED" });
    if (!remarks)
      return errorResponse(400, "Describe the remediation.", {
        code: "VALIDATION_FAILED",
        fieldErrors: { remarks: "Required" },
      });

    const stored = await Promise.all(files.map(storeUpload));
    const attachment = {
      id: newId("fat"),
      findingId: finding.id,
      files: stored,
      remarks,
      uploadedBy: user.id,
      uploadedByName: user.fullName,
      uploadedAt: nowIso(),
    };
    db.findingAttachments.push(attachment);
    logEvent(user, "REMEDIATION_UPLOADED", "Finding", finding.id, `${files.length} file(s) uploaded as remediation`);
    const remediated = party ? toView(finding) : null;
    if (remediated) {
      const view = remediated;
      notify(
        auditorRecipients(),
        {
          type: "REMEDIATION_SUBMITTED",
          title: "Remediation submitted",
          body: `${view.partyName} · ${view.runCode}: "${view.requirement}"`,
          href: `/findings/${finding.id}`,
        },
        user.id,
      );
    }
    persist();
    return HttpResponse.json(attachment, { status: 201 });
  }),

  /** Auditor full authority (§14): status both ways + notes, any time. */
  http.patch(apiUrl("/findings/:id"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.FINDINGS_MANAGE);
    if (user instanceof Response) return user;
    const finding = db.findings.find((f) => f.id === params.id);
    if (!finding) return errorResponse(404, "Finding not found.");
    const body = (await request.json()) as { status?: FindingStatus; remarks?: string | null };
    if (body.status && !["OPEN", "RESOLVED"].includes(body.status)) return errorResponse(400, "Invalid status.");
    if (body.status && body.status !== finding.status) {
      finding.status = body.status;
      const view = toView(finding);
      const run = view && db.auditRuns.find((r) => r.id === view.runId);
      if (view && run) {
        const resolved = body.status === "RESOLVED";
        notify(
          partyRecipients(run),
          {
            type: resolved ? "FINDING_RESOLVED" : "FINDING_REOPENED",
            title: resolved ? "Finding resolved" : "Finding reopened",
            body: `${view.runCode}: "${view.requirement}"${resolved ? "" : " needs more remediation."}`,
            href: `/findings/${finding.id}`,
          },
          user.id,
        );
      }
    }
    if (body.remarks !== undefined) finding.remarks = body.remarks?.trim() || null;
    logEvent(
      user,
      body.status ? `FINDING_${body.status}` : "FINDING_UPDATED",
      "Finding",
      finding.id,
      body.status ? `Finding marked ${body.status.toLowerCase()}` : "Finding notes updated",
    );
    finding.updatedAt = nowIso();
    finding.updatedBy = user.id;
    persist();
    return HttpResponse.json(toView(finding));
  }),
];
