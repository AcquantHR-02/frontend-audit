/**
 * Domain enums from spec V6.
 * Declared as `as const` objects + derived union types (not TS `enum`):
 * values serialise 1:1 with the backend JSON and stay tree-shakeable.
 */

export const Role = {
  AUDITOR_ADMIN: "AUDITOR_ADMIN",
  AUDITOR_USER: "AUDITOR_USER",
  VENDOR_USER: "VENDOR_USER",
  PE_USER: "PE_USER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** §15.5 — discriminator on AuditRun. */
export const AuditType = {
  VENDOR: "VENDOR",
  PE: "PE",
} as const;
export type AuditType = (typeof AuditType)[keyof typeof AuditType];

/** §8 — cadence label on checklist masters (no frequency / due-date fields). */
export const Cadence = {
  LIFETIME: "LIFETIME",
  ONE_TIME: "ONE_TIME",
  PERIODIC: "PERIODIC",
} as const;
export type Cadence = (typeof Cadence)[keyof typeof Cadence];

/** §7 — AIR submission lifecycle. */
export const SubmissionStatus = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  REVIEWED: "REVIEWED",
} as const;
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

/** §9 — final status, stamped by the auditor only. `null` until stamped. */
export const ComplianceStatus = {
  COMPLIED: "COMPLIED",
  NOT_COMPLIED: "NOT_COMPLIED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;
export type ComplianceStatus = (typeof ComplianceStatus)[keyof typeof ComplianceStatus];

/** §14 — wording is OPEN / RESOLVED (never "closed"). */
export const FindingStatus = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
} as const;
export type FindingStatus = (typeof FindingStatus)[keyof typeof FindingStatus];

/** §19 — PE audits only. */
export const TriggerOccasion = {
  ONBOARDING: "ONBOARDING",
  AD_HOC: "AD_HOC",
} as const;
export type TriggerOccasion = (typeof TriggerOccasion)[keyof typeof TriggerOccasion];

/**
 * §4 — run phase, derived from window dates + publish state (never stored).
 * SCHEDULED = created, Window 1 not yet open.
 */
export const RunPhase = {
  SCHEDULED: "SCHEDULED",
  WINDOW_1: "WINDOW_1",
  REVIEW: "REVIEW",
  WINDOW_2: "WINDOW_2",
  FINAL_REVIEW: "FINAL_REVIEW",
  PUBLISHED: "PUBLISHED",
} as const;
export type RunPhase = (typeof RunPhase)[keyof typeof RunPhase];
