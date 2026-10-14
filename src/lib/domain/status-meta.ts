/**
 * Display metadata (label + tone) for every status-like enum.
 * One source of truth so a status reads the same on every screen.
 */
import type {
  AuditType,
  Cadence,
  ComplianceStatus,
  FindingStatus,
  Role,
  RunPhase,
  SubmissionStatus,
} from "@/types/domain";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "primary" | "violet";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
}

export const runPhaseMeta: Record<RunPhase, StatusMeta> = {
  SCHEDULED: { label: "Scheduled", tone: "neutral" },
  WINDOW_1: { label: "Window 1", tone: "info" },
  REVIEW: { label: "Auditor review", tone: "warning" },
  WINDOW_2: { label: "Window 2", tone: "warning" },
  FINAL_REVIEW: { label: "Final review", tone: "primary" },
  PUBLISHED: { label: "Published", tone: "success" },
};

export const complianceMeta: Record<ComplianceStatus, StatusMeta> = {
  COMPLIED: { label: "Complied", tone: "success" },
  NOT_COMPLIED: { label: "Not complied", tone: "danger" },
  NOT_APPLICABLE: { label: "Not applicable", tone: "neutral" },
};

export const submissionMeta: Record<SubmissionStatus, StatusMeta> = {
  PENDING: { label: "Pending", tone: "warning" },
  SUBMITTED: { label: "Submitted", tone: "info" },
  REVIEWED: { label: "Reviewed", tone: "primary" },
};

export const findingMeta: Record<FindingStatus, StatusMeta> = {
  OPEN: { label: "Open", tone: "danger" },
  RESOLVED: { label: "Resolved", tone: "success" },
};

export const roleMeta: Record<Role, StatusMeta> = {
  AUDITOR_ADMIN: { label: "Auditor Admin", tone: "primary" },
  AUDITOR_USER: { label: "Auditor", tone: "info" },
  VENDOR_USER: { label: "Vendor", tone: "warning" },
  PE_USER: { label: "Principal Employer", tone: "violet" },
};

export const cadenceMeta: Record<Cadence, StatusMeta> = {
  LIFETIME: { label: "Lifetime", tone: "violet" },
  ONE_TIME: { label: "One-time", tone: "info" },
  PERIODIC: { label: "Periodic", tone: "neutral" },
};

export const auditTypeMeta: Record<AuditType, StatusMeta> = {
  VENDOR: { label: "Vendor audit", tone: "neutral" },
  PE: { label: "PE audit", tone: "violet" },
};
