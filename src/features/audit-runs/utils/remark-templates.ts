import type { ComplianceStatus } from "@/types/domain";

/** One-click starting points for audit remarks; the auditor can edit before saving. */
export const remarkTemplates: Record<ComplianceStatus, string[]> = {
  COMPLIED: [
    "Verified against originals at the site visit.",
    "Evidence checked and found in order for the period.",
    "Returns and challans verified; filed within the due date.",
  ],
  NOT_APPLICABLE: [
    "No event in the period, so the requirement didn't arise.",
    "Not applicable to this establishment's headcount.",
    "Confirmed with the site in-charge that this doesn't apply.",
  ],
  NOT_COMPLIED: [
    "Not filed for the period; no evidence produced.",
    "Evidence incomplete or for the wrong period.",
    "Filed after the due date.",
  ],
};
