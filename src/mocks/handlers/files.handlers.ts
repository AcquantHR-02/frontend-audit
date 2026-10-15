import { http, HttpResponse } from "msw";
import { formatDate, formatDateRange } from "@/lib/utils";
import type { StoredFile } from "@/types/domain";
import { authenticate } from "../auth";
import { db } from "../db";
import { loadFile, sampleImage, samplePdf } from "../files";
import { apiUrl, errorResponse, networkDelay } from "../utils";
import { toRunView, visibleTo } from "./audit-runs.handlers";
import { canSee } from "./findings.handlers";
import type { User } from "@/types/domain";

/** Finds the record a file belongs to and checks the caller may read it (same rules as the record). */
function locate(user: User, fileId: string) {
  for (const record of db.evidence) {
    const file = record.files.find((f) => f.id === fileId);
    if (!file) continue;
    const air = db.airs.find((a) => a.id === record.airId);
    const run = air && db.auditRuns.find((r) => r.id === air.runId);
    if (!air || !run || !visibleTo(user, run)) return null;
    const view = toRunView(run);
    return {
      file,
      lines: [
        `Audited party: ${view.partyName}`,
        `Unit: ${view.unitCode} ${view.unitName}`,
        `Requirement: ${air.descriptionSnapshot}`,
        `Act: ${air.actNameSnapshot}`,
        air.periodStart
          ? `Period: ${formatDateRange(air.periodStart, air.periodEnd)}`
          : "Period: whole activity period",
        `Audit run: ${run.code}`,
        `Submitted by ${record.uploadedByName} on ${formatDate(record.uploadedAt)}`,
      ],
    };
  }
  for (const attachment of db.findingAttachments) {
    const file = attachment.files.find((f) => f.id === fileId);
    if (!file) continue;
    const finding = db.findings.find((f) => f.id === attachment.findingId);
    if (!finding || !canSee(user, finding)) return null;
    return { file, lines: [`Remediation: ${attachment.remarks}`, `Uploaded by ${attachment.uploadedByName}`] };
  }
  return null;
}

/** Demo evidence has no stored bytes: render a sample document matching the file type. */
function sample(file: StoredFile, lines: string[]): Blob {
  const title = file.fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return file.contentType.startsWith("image/") ? sampleImage(title, lines) : samplePdf(title, lines);
}

export const filesHandlers = [
  /** Authenticated download (the real backend redirects to a short-lived signed URL). */
  http.get(apiUrl("/files/:id"), async ({ request, params }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    const found = locate(user, String(params.id));
    if (!found) return errorResponse(404, "File not found.", { code: "NOT_FOUND" });
    const blob =
      (await loadFile(found.file.id)) ??
      (found.file.id.startsWith("file-demo-") ? sample(found.file, found.lines) : null);
    if (!blob) {
      return errorResponse(410, "This file is no longer stored in the demo browser data.", { code: "FILE_GONE" });
    }
    return new HttpResponse(blob, {
      headers: {
        "Content-Type": found.file.contentType,
        "Content-Disposition": `inline; filename="${found.file.fileName.replace(/"/g, "")}"`,
      },
    });
  }),
];
