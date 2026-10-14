import { describe, expect, it } from "vitest";
import { fyLabel, nextPurgeDate, purgeCutoff, purgeNotice } from "./retention";

describe("retention (§12.14)", () => {
  it("purges on the next 1 April", () => {
    expect(nextPurgeDate("2026-10-14")).toBe("2027-04-01");
    expect(nextPurgeDate("2027-04-01")).toBe("2027-04-01");
    expect(nextPurgeDate("2027-01-15")).toBe("2027-04-01");
  });

  it("keeps two full financial years", () => {
    // On 1 Apr 2027, FY 2024-25 and earlier become eligible.
    expect(purgeCutoff("2027-04-01")).toBe("2025-03-31");
    expect(fyLabel("2025-03-31")).toBe("FY 2024-25");
    expect(fyLabel("2026-07-31")).toBe("FY 2026-27");
  });

  it("raises 30-day and 7-day notices", () => {
    expect(purgeNotice("2027-02-01")).toBeNull();
    expect(purgeNotice("2027-03-05")).toEqual({ days: 27, level: "30" });
    expect(purgeNotice("2027-03-28")).toEqual({ days: 4, level: "7" });
  });
});
