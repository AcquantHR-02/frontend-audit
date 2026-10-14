import { describe, expect, it } from "vitest";
import { deriveRunPhase } from "./audit-runs";
import { canPartyUpload, evaluateEndOfReview, needsValidTo, publishCheck, validateEvidence } from "./review";

const C = { complianceStatus: "COMPLIED" as const, auditRemarks: "ok" };
const NC = { complianceStatus: "NOT_COMPLIED" as const, auditRemarks: "missing" };
const PENDING = { complianceStatus: null, auditRemarks: null };

describe("review rules", () => {
  it("lets the party write in Window 1, and only NC/unstamped items in Window 2 (§4)", () => {
    expect(canPartyUpload("WINDOW_1", C)).toBe(true);
    expect(canPartyUpload("WINDOW_2", NC)).toBe(true);
    expect(canPartyUpload("WINDOW_2", PENDING)).toBe(true);
    expect(canPartyUpload("WINDOW_2", C)).toBe(false);
    expect(canPartyUpload("REVIEW", PENDING)).toBe(false);
  });

  it("enforces file counts and remarks (§12.7)", () => {
    expect(validateEvidence({ uploader: "PARTY", fileCount: 0, naProposed: false, partyRemarks: "x" })).toMatch(
      /at least one/,
    );
    expect(validateEvidence({ uploader: "PARTY", fileCount: 0, naProposed: true, partyRemarks: "" })).toMatch(
      /doesn't apply/,
    );
    expect(
      validateEvidence({ uploader: "PARTY", fileCount: 0, naProposed: true, partyRemarks: "No hires" }),
    ).toBeNull();
    expect(validateEvidence({ uploader: "PARTY", fileCount: 4, naProposed: false, partyRemarks: "x" })).toMatch(
      /at most 3/,
    );
    expect(validateEvidence({ uploader: "AUDITOR", fileCount: 0, naProposed: false, partyRemarks: "" })).toBeNull();
  });

  it("requires validTo only for ONE_TIME items with evidence", () => {
    expect(needsValidTo("ONE_TIME", true)).toBe(true);
    expect(needsValidTo("ONE_TIME", false)).toBe(false);
    expect(needsValidTo("LIFETIME", true)).toBe(false);
  });

  it("requires Window 2 when anything is pending or not complied (§4)", () => {
    expect(evaluateEndOfReview([C, C])).toMatchObject({ needsWindow2: false });
    expect(evaluateEndOfReview([C, NC, PENDING])).toEqual({ pending: 1, notComplied: 1, needsWindow2: true });
  });

  it("blocks publishing on unstamped items or missing remarks; S2 only warns", () => {
    expect(publishCheck([C, NC])).toMatchObject({ canPublish: true, findingsToOpen: 1, warnings: [] });
    expect(publishCheck([C, PENDING]).canPublish).toBe(false);
    expect(publishCheck([{ complianceStatus: "COMPLIED", auditRemarks: " " }]).blocking[0]).toMatch(/no audit remarks/);
    expect(publishCheck([C], 2).warnings[0]).toMatch(/2 assigned periodic items/);
  });

  it("honours early window closure in the phase", () => {
    const run = {
      window1Start: "2026-08-01",
      window1End: "2026-08-10",
      window2Start: null,
      window2End: null,
      publishedAt: null,
    };
    expect(deriveRunPhase({ ...run, reviewStart: "2026-08-05" }, "2026-08-06")).toBe("REVIEW");
    expect(deriveRunPhase({ ...run, finalReviewStart: "2026-08-12" }, "2026-08-12")).toBe("FINAL_REVIEW");
  });
});
