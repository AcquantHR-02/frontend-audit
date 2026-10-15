/**
 * Evidence + review rules — spec §4, §6 Step 3, §9, §12.7, §20 S1/S2. Pure functions.
 */
import type { AuditItemResult, Cadence, RunPhase } from "@/types/domain";

export const MAX_FILES = 3;

/** §4 — audited party writes: Window 1 freely; Window 2 only for NC / never-stamped items. */
export function canPartyUpload(phase: RunPhase, air: Pick<AuditItemResult, "complianceStatus">): boolean {
  if (phase === "WINDOW_1") return true;
  if (phase === "WINDOW_2") return air.complianceStatus === null || air.complianceStatus === "NOT_COMPLIED";
  return false;
}

/** Auditor stamps during review phases (re-stamps allowed until publish). */
export const canAuditorStamp = (phase: RunPhase) =>
  phase === "REVIEW" || phase === "WINDOW_2" || phase === "FINAL_REVIEW";

/** Path 2 — auditor uploads any time before publish. */
export const canAuditorUpload = (phase: RunPhase) => phase !== "PUBLISHED";

/**
 * §12.7 file rules. Party: 1–3 files (0–3 when proposing NA), remarks mandatory.
 * Auditor (Path 2): 0–3 files, no party remarks.
 */
export function validateEvidence(input: {
  uploader: "PARTY" | "AUDITOR";
  fileCount: number;
  naProposed: boolean;
  partyRemarks: string;
}): string | null {
  if (input.fileCount > MAX_FILES) return `Attach at most ${MAX_FILES} files.`;
  if (input.uploader === "AUDITOR") return null;
  if (!input.naProposed && input.fileCount < 1)
    return "Attach at least one file, or propose the item as not applicable.";
  if (!input.partyRemarks.trim()) {
    return input.naProposed ? "Explain why this item doesn't apply." : "Add remarks describing the evidence.";
  }
  return null;
}

/** §9 / §6 Step 3b — validTo is mandatory for ONE_TIME items that have an evidence record. */
export const needsValidTo = (cadence: Cadence, hasEvidence: boolean) => cadence === "ONE_TIME" && hasEvidence;

/** Upper bound for one bulk stamp request. */
export const MAX_BULK_STAMP = 200;

/**
 * Bulk stamping applies one status + one remark to many items. ONE_TIME items with evidence
 * need their own certificate valid-to date, so they're left for individual review.
 */
export function bulkStampBlocker(air: Pick<AuditItemResult, "cadenceSnapshot">, hasEvidence: boolean): string | null {
  return needsValidTo(air.cadenceSnapshot, hasEvidence)
    ? "Needs a certificate valid-to date, so stamp it individually."
    : null;
}

/** §4 — end-of-Review evaluation: Window 2 is required if anything is pending or not complied. */
export function evaluateEndOfReview(airs: Pick<AuditItemResult, "complianceStatus">[]) {
  const pending = airs.filter((a) => a.complianceStatus === null).length;
  const notComplied = airs.filter((a) => a.complianceStatus === "NOT_COMPLIED").length;
  return { pending, notComplied, needsWindow2: pending + notComplied > 0 };
}

/** §15.3 / §20 S2 — what blocks publishing, and what only warns. */
export function publishCheck(
  airs: Pick<AuditItemResult, "complianceStatus" | "auditRemarks">[],
  periodicItemsWithoutAirs = 0,
) {
  const unstamped = airs.filter((a) => a.complianceStatus === null).length;
  const missingRemarks = airs.filter((a) => a.complianceStatus !== null && !a.auditRemarks?.trim()).length;
  const findingsToOpen = airs.filter((a) => a.complianceStatus === "NOT_COMPLIED").length;
  const blocking: string[] = [];
  if (unstamped) blocking.push(`${unstamped} item${unstamped === 1 ? " is" : "s are"} not stamped yet.`);
  if (missingRemarks)
    blocking.push(`${missingRemarks} item${missingRemarks === 1 ? " has" : "s have"} no audit remarks.`);
  const warnings: string[] = [];
  if (periodicItemsWithoutAirs) {
    warnings.push(
      `${periodicItemsWithoutAirs} assigned periodic item${periodicItemsWithoutAirs === 1 ? " has" : "s have"} no periods in this run.`,
    );
  }
  return { canPublish: blocking.length === 0, blocking, warnings, findingsToOpen };
}
