import { describe, expect, it } from "vitest";
import { deriveRunPhase, generatePeriods, suggestWindows, validateRunDates } from "./audit-runs";

const valid = {
  activityPeriodStart: "2026-01-01",
  activityPeriodEnd: "2026-06-30",
  executionWindowStart: "2026-07-01",
  executionWindowEnd: "2026-07-31",
  window1Start: "2026-07-01",
  window1End: "2026-07-10",
};

describe("audit run rules", () => {
  it("accepts the spec's example dates (§4)", () => {
    expect(validateRunDates(valid)).toEqual({});
  });

  it("requires the execution window to start after the activity period", () => {
    expect(validateRunDates({ ...valid, executionWindowStart: "2026-06-15" })).toHaveProperty("executionWindowStart");
  });

  it("keeps Window 1 inside the execution window", () => {
    expect(validateRunDates({ ...valid, window1End: "2026-08-05" })).toHaveProperty("window1End");
    expect(validateRunDates({ ...valid, window1Start: "2026-06-20" })).toHaveProperty("window1Start");
  });

  it("suggests windows right after the activity period", () => {
    expect(suggestWindows("2026-06-30")).toEqual({
      executionWindowStart: "2026-07-01",
      executionWindowEnd: "2026-07-30",
      window1Start: "2026-07-01",
      window1End: "2026-07-10",
    });
  });

  it("derives the phase from dates; Window 2 only when set", () => {
    const run = {
      window1Start: "2026-07-01",
      window1End: "2026-07-10",
      window2Start: null,
      window2End: null,
      publishedAt: null,
    };
    expect(deriveRunPhase(run, "2026-06-30")).toBe("SCHEDULED");
    expect(deriveRunPhase(run, "2026-07-05")).toBe("WINDOW_1");
    expect(deriveRunPhase(run, "2026-07-11")).toBe("REVIEW");
    const w2 = { ...run, window2Start: "2026-07-12", window2End: "2026-07-14" };
    expect(deriveRunPhase(w2, "2026-07-13")).toBe("WINDOW_2");
    expect(deriveRunPhase(w2, "2026-07-15")).toBe("FINAL_REVIEW");
    expect(deriveRunPhase({ ...w2, publishedAt: "2026-07-15T10:00:00Z" }, "2026-07-15")).toBe("PUBLISHED");
  });

  it("generates calendar-aligned periods clipped to the activity period", () => {
    expect(generatePeriods("2026-01-01", "2026-06-30", "MONTHLY")).toHaveLength(6);
    expect(generatePeriods("2026-01-15", "2026-03-10", "MONTHLY")[0]).toEqual({
      periodStart: "2026-01-15",
      periodEnd: "2026-01-31",
    });
    expect(generatePeriods("2026-01-01", "2026-06-30", "QUARTERLY")).toEqual([
      { periodStart: "2026-01-01", periodEnd: "2026-03-31" },
      { periodStart: "2026-04-01", periodEnd: "2026-06-30" },
    ]);
    expect(generatePeriods("2026-01-01", "2026-06-30", "HALF_YEARLY")).toEqual([
      { periodStart: "2026-01-01", periodEnd: "2026-03-31" },
      { periodStart: "2026-04-01", periodEnd: "2026-06-30" },
    ]);
    expect(generatePeriods("2026-07-01", "2026-07-31", "WHOLE")).toEqual([
      { periodStart: "2026-07-01", periodEnd: "2026-07-31" },
    ]);
  });
});
