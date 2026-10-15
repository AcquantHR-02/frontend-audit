import type { AuditColumns, Id } from "./common";
import type { Role } from "./enums";

/**
 * §18 — 4 roles. VENDOR_USER carries vendorId, PE_USER carries peId; auditor roles carry neither.
 * All accounts are created by AUDITOR_ADMIN (no self-signup).
 */
export interface User extends AuditColumns {
  id: Id;
  email: string;
  fullName: string;
  role: Role;
  vendorId: Id | null;
  peId: Id | null;
  isActive: boolean;
  /** Forces password change on next login (first admin bootstrap, admin resets). */
  mustChangePassword: boolean;
  /** Locked after repeated failed logins; only AUDITOR_ADMIN can unlock. */
  isLocked: boolean;
}

/** User row as listed in administration, with the scoped party's name resolved. */
export interface UserView extends User {
  /** Vendor name (VENDOR_USER) or PE name (PE_USER); null for auditor roles. */
  scopeName: string | null;
}

/** The narrow shape kept in the client auth state. */
export type SessionUser = Pick<User, "id" | "email" | "fullName" | "role" | "vendorId" | "peId" | "mustChangePassword">;

/** A named list filter a user saved (the list page's query string, minus paging). */
export interface SavedView {
  id: Id;
  userId: Id;
  /** Which list it belongs to, e.g. "audit-runs". */
  scope: string;
  name: string;
  query: string;
  createdAt: string;
}
