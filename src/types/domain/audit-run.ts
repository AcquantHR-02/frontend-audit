import type { AuditColumns, Id, IsoDate, IsoDateTime } from "./common";
import type { AuditType, TriggerOccasion } from "./enums";

/** Raw AIR counts. Stored raw, rounded only at display (§10). */
export interface ScoreCounts {
  complied: number;
  notComplied: number;
  notApplicable: number;
  pending: number; // not yet stamped
  assignedTotal: number;
}

/**
 * §15.5 — single table for both audit types.
 * Invariant: VENDOR ⇒ vendorId set & peId null; PE ⇒ peId set & vendorId null.
 * Modelled as a discriminated union so TypeScript enforces the same rule.
 */
interface AuditRunBase extends AuditColumns {
  id: Id;
  peUnitId: Id;

  activityPeriodStart: IsoDate;
  activityPeriodEnd: IsoDate;
  executionWindowStart: IsoDate; // ≥ activityPeriodEnd
  executionWindowEnd: IsoDate;

  window1Start: IsoDate;
  window1End: IsoDate;
  reviewStart: IsoDate | null;
  window2Start: IsoDate | null; // null ⇒ Window 2 never fired
  window2End: IsoDate | null;
  finalReviewStart: IsoDate | null;

  publishedAt: IsoDateTime | null;
  publishedBy: Id | null;

  /** Denormalised for list views; computed by the backend. */
  score: ScoreCounts;
}

export interface VendorAuditRun extends AuditRunBase {
  auditType: typeof AuditType.VENDOR;
  vendorId: Id;
  peId: null;
  triggerOccasion: null;
}

export interface PEAuditRun extends AuditRunBase {
  auditType: typeof AuditType.PE;
  vendorId: null;
  peId: Id;
  triggerOccasion: TriggerOccasion;
}

export type AuditRun = VendorAuditRun | PEAuditRun;
