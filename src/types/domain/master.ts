import type { AuditColumns, Id, IsoDateTime } from "./common";
import type { Cadence } from "./enums";

/** §12.1 — Indian state; scopes checklist masters and PE units. */
export interface State extends AuditColumns {
  id: Id;
  code: string; // e.g. "KA"
  name: string; // e.g. "Karnataka"
}

/** §7 #10 — independent Act master. Soft-delete via `isActive`. */
export interface Act extends AuditColumns {
  id: Id;
  name: string;
  shortName: string;
  category: string | null;
  isActive: boolean;
}

/** §2 — Principal Employer, e.g. Veero Metals. */
export interface PrincipalEmployer extends AuditColumns {
  id: Id;
  name: string; // display name, e.g. "Veero Metals"
  legalName: string; // e.g. "Veero O Metals Private Limited"
  isActive: boolean;
}

/** §7 #2, §13 — belongs to a PE, located in a state. Closure is reversible. */
export interface PEUnit extends AuditColumns {
  id: Id;
  peId: Id;
  stateId: Id;
  code: string; // e.g. "VOM-JIG"
  name: string; // e.g. "Jigani"
  closedAt: IsoDateTime | null;
  closedBy: Id | null;
}

/** §2 — Contractor / vendor supplying workers. */
export interface Vendor extends AuditColumns {
  id: Id;
  name: string;
  isActive: boolean;
}

/**
 * §7 #11 / §12.5 — vendor-side checklist master.
 * `stateId = null` means NATIONAL. Mutable; AIRs snapshot description/cadence.
 */
export interface ChecklistItem extends AuditColumns {
  id: Id;
  actId: Id;
  stateId: Id | null;
  description: string;
  cadence: Cadence;
  isActive: boolean;
}

/** §19 — PE-side checklist master. Same shape, separate table. */
export type PEChecklistItem = ChecklistItem;

/* ---------- List/read views returned by the API (entity + derived, read-only fields) ---------- */

export interface ActSummary extends Act {
  checklistItemCount: number;
  peChecklistItemCount: number;
}

export interface PrincipalEmployerSummary extends PrincipalEmployer {
  unitCount: number;
  openUnitCount: number;
}

export interface VendorSummary extends Vendor {
  /** Units with a currently effective VendorUnitAssignment. */
  activeUnitCount: number;
}

export interface ChecklistItemView extends ChecklistItem {
  actShortName: string;
  /** null = NATIONAL */
  stateCode: string | null;
}

export interface PEUnitView extends PEUnit {
  stateCode: string;
  /** Vendors currently assigned to this unit. */
  activeVendorCount: number;
}
