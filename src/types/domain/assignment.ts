import type { AuditColumns, Id, IsoDate } from "./common";

/** Versioning window shared by all assignment types (§7A Lock 7). `effectiveTo = null` = open-ended. */
export interface EffectivePeriod {
  effectiveFrom: IsoDate;
  effectiveTo: IsoDate | null;
}

/** §12.2 — which units a vendor operates at (many-to-many, versioned). */
export interface VendorUnitAssignment extends AuditColumns, EffectivePeriod {
  id: Id;
  vendorId: Id;
  peUnitId: Id;
}

/**
 * §7A / §12.3 — which ChecklistItems apply to a (Vendor, Unit), as one version.
 * Assumption (confirm with backend): a version holds the full ticked item set.
 */
export interface VendorChecklistAssignment extends AuditColumns, EffectivePeriod {
  id: Id;
  vendorId: Id;
  peUnitId: Id;
  checklistItemIds: Id[];
}

/** §19 / §12.4 — which PEChecklistItems apply to a PE (per PE, not per unit). */
export interface PEChecklistAssignment extends AuditColumns, EffectivePeriod {
  id: Id;
  peId: Id;
  peChecklistItemIds: Id[];
}

/* ---------- API views ---------- */

/** Derived from dates: FUTURE (not started), CURRENT, ENDED. */
export type AssignmentStatus = "FUTURE" | "CURRENT" | "ENDED";

export interface VendorUnitAssignmentView extends VendorUnitAssignment {
  vendorName: string;
  unitCode: string;
  unitName: string;
  unitStateId: Id;
  peId: Id;
  peName: string;
  status: AssignmentStatus;
}
