import type { AuditColumns, Id, IsoDate } from "./common";
import type { Cadence, ComplianceStatus, SubmissionStatus } from "./enums";

/**
 * §7 #14 / §15.6 — Audit Item Result (AIR): one per compliance-period instance in a run.
 * Exactly one of checklistItemId / peChecklistItemId is set (XOR).
 * Display MUST use the snapshot columns, never the live master (§7A Lock 4).
 */
export interface AuditItemResult extends AuditColumns {
  id: Id;
  runId: Id;

  checklistItemId: Id | null; // vendor audit
  peChecklistItemId: Id | null; // PE audit

  /** Write-once snapshots taken at materialisation. */
  descriptionSnapshot: string;
  cadenceSnapshot: Cadence;
  actNameSnapshot: string;

  /** Auditor-entered for PERIODIC; null for LIFETIME / ONE_TIME. */
  periodStart: IsoDate | null;
  periodEnd: IsoDate | null;
  /** Optional reporting metadata — not a logic input. */
  dueDate: IsoDate | null;

  submissionStatus: SubmissionStatus;
  complianceStatus: ComplianceStatus | null;
  /** Mandatory on every AIR before Publish. */
  auditRemarks: string | null;

  /** True when pre-stamped COMPLIED by Mode A carry-forward (§15.8). Derived by backend. */
  isCarriedForward: boolean;
  evidenceCount: number;
}
