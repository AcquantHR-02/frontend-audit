import { describe, expect, it } from "vitest";
import { addDays, assignmentStatus, periodsOverlap, planNewVersion, resolveCoveringVersion } from "./assignments";

const v = (effectiveFrom: string, effectiveTo: string | null) => ({ effectiveFrom, effectiveTo });

describe("assignment rules", () => {
  it("adds days across month/year boundaries", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("derives status from dates", () => {
    expect(assignmentStatus(v("2026-11-01", null), "2026-10-14")).toBe("FUTURE");
    expect(assignmentStatus(v("2026-04-01", null), "2026-10-14")).toBe("CURRENT");
    expect(assignmentStatus(v("2026-04-01", "2026-09-30"), "2026-10-14")).toBe("ENDED");
  });

  it("detects overlapping periods, open-ended included", () => {
    expect(periodsOverlap(v("2026-04-01", null), v("2027-01-01", null))).toBe(true);
    expect(periodsOverlap(v("2026-04-01", "2026-06-30"), v("2026-07-01", null))).toBe(false);
  });

  describe("§15.9 full-period coverage", () => {
    it("errors when no assignment exists", () => {
      expect(resolveCoveringVersion([], "2026-07-01", "2026-07-31")).toMatchObject({
        ok: false,
        code: "ASSIGNMENT_NOT_FOUND",
      });
    });

    it("picks the single version covering the whole period", () => {
      const versions = [v("2026-04-01", "2026-06-30"), v("2026-07-01", null)];
      expect(resolveCoveringVersion(versions, "2026-07-01", "2026-12-31")).toMatchObject({
        ok: true,
        version: versions[1],
      });
    });

    it("never merges versions when the assignment changed mid-period", () => {
      const versions = [v("2026-04-01", "2026-06-30"), v("2026-07-01", null)];
      expect(resolveCoveringVersion(versions, "2026-06-01", "2026-07-31")).toMatchObject({
        ok: false,
        code: "ASSIGNMENT_CHANGED_IN_PERIOD",
      });
    });
  });

  it("plans a new version after the current one and closes the previous the day before", () => {
    const versions = [v("2026-04-01", null)];
    expect(planNewVersion(versions, "2026-04-01")).toMatchObject({ ok: false });
    expect(planNewVersion(versions, "2026-10-01")).toMatchObject({ ok: true, previousEndsOn: "2026-09-30" });
    expect(planNewVersion([], "2026-10-01")).toMatchObject({ ok: true, previous: null, previousEndsOn: null });
  });
});
