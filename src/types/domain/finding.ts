import type { AuditColumns, Id, IsoDateTime } from "./common";
import type { FindingStatus } from "./enums";
import type { StoredFile } from "./evidence";

/**
 * §14 / §15.7 — opened at Publish for every AIR with final NOT_COMPLIED.
 * UNIQUE FK to the AIR; the (party, unit, item, period) identity is derived via air → run.
 */
export interface Finding extends AuditColumns {
  id: Id;
  airId: Id;
  status: FindingStatus;
  remarks: string | null;
}

/** Remediation evidence uploaded against a Finding (own stream, never the published run). */
export interface FindingAttachment {
  id: Id;
  findingId: Id;
  files: StoredFile[]; // 1–3
  remarks: string; // mandatory
  uploadedBy: Id;
  uploadedByName: string;
  uploadedAt: IsoDateTime;
}
