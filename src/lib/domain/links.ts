import type { AuditType } from "@/types/domain";

/** Route of an audited party's scorecard: a vendor, or a Principal Employer's own (PE) audits. */
export const scorecardHref = (auditType: AuditType, partyId: string) =>
  auditType === "VENDOR" ? `/reports/vendors/${partyId}` : `/reports/principal-employers/${partyId}`;
