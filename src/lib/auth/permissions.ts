/**
 * Role → permission map — spec §18 (4 roles) + §12.10.
 * The ONLY place that knows which role can do what. UI checks permissions, never roles,
 * so a rule change is a one-line edit here.
 *
 * Note: these are capability checks. Resource-level scoping (a VENDOR_USER sees only their
 * own vendor; PE_USER can upload only on their own PE's audit runs) is enforced by the backend
 * and by context checks on the relevant screens.
 */
import type { Role, SessionUser } from "@/types/domain";

export const Permission = {
  DASHBOARD_VIEW: "dashboard:view",

  AUDIT_RUNS_VIEW: "auditRuns:view",
  AUDIT_RUNS_CREATE: "auditRuns:create", // incl. PERIODIC AIR materialisation + window dates
  AUDIT_RUNS_REVIEW: "auditRuns:review", // stamp C/NA/NC, auditRemarks, validTo, open Window 2
  AUDIT_RUNS_PUBLISH: "auditRuns:publish",
  AUDIT_RUNS_EDIT_PUBLISHED: "auditRuns:editPublished", // §15.3 — admin only

  EVIDENCE_UPLOAD_AS_PARTY: "evidence:uploadAsParty", // Path 1
  EVIDENCE_UPLOAD_AS_AUDITOR: "evidence:uploadAsAuditor", // Path 2
  EVIDENCE_INVALIDATE: "evidence:invalidate", // §15.4 — admin only

  FINDINGS_VIEW: "findings:view",
  FINDINGS_MANAGE: "findings:manage", // CRUD + mark resolved
  FINDINGS_REMEDIATE: "findings:remediate", // party uploads remediation

  REPORTS_VIEW: "reports:view",

  ASSIGNMENTS_MANAGE: "assignments:manage",

  MASTERS_VIEW: "masters:view",
  MASTERS_MANAGE: "masters:manage", // §18 — admin only

  USERS_MANAGE: "users:manage", // admin only
  AUDIT_TRAIL_VIEW: "auditTrail:view",
  RETENTION_VIEW: "retention:view", // pre-purge notices go to both auditor roles (§12.14)
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const P = Permission;

/** Day-to-day audit execution — shared by both auditor roles (§18). */
const auditorUser: Permission[] = [
  P.DASHBOARD_VIEW,
  P.AUDIT_RUNS_VIEW,
  P.AUDIT_RUNS_CREATE,
  P.AUDIT_RUNS_REVIEW,
  P.AUDIT_RUNS_PUBLISH,
  P.EVIDENCE_UPLOAD_AS_AUDITOR,
  P.FINDINGS_VIEW,
  P.FINDINGS_MANAGE,
  P.REPORTS_VIEW,
  P.ASSIGNMENTS_MANAGE,
  P.MASTERS_VIEW,
  P.RETENTION_VIEW,
];

/** Audited party (vendor or PE): upload, remediate, read own results. */
const auditedParty: Permission[] = [
  P.DASHBOARD_VIEW,
  P.AUDIT_RUNS_VIEW,
  P.EVIDENCE_UPLOAD_AS_PARTY,
  P.FINDINGS_VIEW,
  P.FINDINGS_REMEDIATE,
  P.REPORTS_VIEW,
];

export const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  AUDITOR_ADMIN: new Set([
    ...auditorUser,
    P.AUDIT_RUNS_EDIT_PUBLISHED,
    P.EVIDENCE_INVALIDATE,
    P.MASTERS_MANAGE,
    P.USERS_MANAGE,
    P.AUDIT_TRAIL_VIEW,
  ]),
  AUDITOR_USER: new Set(auditorUser),
  VENDOR_USER: new Set(auditedParty),
  PE_USER: new Set(auditedParty),
};

type MaybeUser = Pick<SessionUser, "role"> | null | undefined;

/** `can(user, Permission.USERS_MANAGE)` — false for a signed-out user. */
export function can(user: MaybeUser, permission: Permission): boolean {
  return !!user && rolePermissions[user.role].has(permission);
}

/** True when the user holds at least one of the given permissions. */
export function canAny(user: MaybeUser, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(user, permission));
}

export const isAuditor = (user: MaybeUser) => user?.role === "AUDITOR_ADMIN" || user?.role === "AUDITOR_USER";
