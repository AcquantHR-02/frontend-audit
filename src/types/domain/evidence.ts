import type { Id, IsoDate, IsoDateTime } from "./common";

export interface StoredFile {
  id: Id;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
}

/**
 * §7 #16 — one row per submission. Created only by Path 1 (party) or Path 2 (auditor).
 * Path 3 (fully offline) creates no EvidenceRecord.
 *
 * File-count rules:
 *  - party, naProposedByParty = false → 1–3 files (mandatory)
 *  - party, naProposedByParty = true  → 0–3 files
 *  - auditor upload                   → 0–3 files, partyRemarks null
 */
export interface EvidenceRecord {
  id: Id;
  airId: Id;
  files: StoredFile[];

  /** vendorRemarks (vendor audit) / peRemarks (PE audit). Null when the auditor uploads. */
  partyRemarks: string | null;
  naProposedByParty: boolean;

  /** Auditor-filled at review. Mandatory for ONE_TIME, null otherwise. */
  validTo: IsoDate | null;

  uploadedBy: Id;
  uploadedByName: string;
  uploadedAt: IsoDateTime;
  isActive: boolean;

  /** §15.4 — LIFETIME / ONE_TIME only. */
  invalidatedAt: IsoDateTime | null;
  invalidatedBy: Id | null;
  invalidationReason: string | null;

  /** §15.8 — Mode A carry-forward provenance. */
  carriedForwardAt: IsoDateTime | null;
  carriedForwardFromRunId: Id | null;
}
