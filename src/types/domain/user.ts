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
}

/** The narrow shape kept in the client auth state. */
export type SessionUser = Pick<User, "id" | "email" | "fullName" | "role" | "vendorId" | "peId" | "mustChangePassword">;
