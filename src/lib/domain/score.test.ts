import { describe, expect, it } from "vitest";
import { formatScore, scoreInTenths, sumScores } from "./score";

describe("score (spec §10)", () => {
  it.each([
    // [label, complied, NA, total, expected]
    ["Bellfast — Harohalli", 25, 12, 37, "100.0%"],
    ["Rathna — Makali", 24, 11, 37, "94.6%"],
    ["July 2026 grand total", 1372, 820, 2217, "98.9%"],
    // Spec lists 99.4%, but 368/370 = 99.459…% → half-up gives 99.5%.
    // The spec's figure looks truncated; flagged in PROGRESS.md for confirmation.
    ["Rathna — total", 247, 121, 370, "99.5%"],
  ])("%s", (_label, complied, notApplicable, assignedTotal, expected) => {
    expect(formatScore({ complied, notApplicable, assignedTotal })).toBe(expected);
  });

  it("always shows one decimal", () => {
    expect(formatScore({ complied: 10, notApplicable: 0, assignedTotal: 10 })).toBe("100.0%");
    expect(formatScore({ complied: 0, notApplicable: 0, assignedTotal: 4 })).toBe("0.0%");
  });

  it("rounds exact .x5 boundaries half-up", () => {
    // 1/8 = 12.5% exactly; 1/16 = 6.25% → 6.3%
    expect(formatScore({ complied: 1, notApplicable: 0, assignedTotal: 8 })).toBe("12.5%");
    expect(formatScore({ complied: 1, notApplicable: 0, assignedTotal: 16 })).toBe("6.3%");
    // 1/32 = 3.125% → 3.1%; 1/2000 = 0.05% → 0.1%
    expect(formatScore({ complied: 1, notApplicable: 0, assignedTotal: 32 })).toBe("3.1%");
    expect(formatScore({ complied: 1, notApplicable: 0, assignedTotal: 2000 })).toBe("0.1%");
  });

  it("returns a placeholder when nothing is assigned", () => {
    expect(scoreInTenths({ complied: 0, notApplicable: 0, assignedTotal: 0 })).toBeNull();
    expect(formatScore({ complied: 0, notApplicable: 0, assignedTotal: 0 })).toBe("—");
  });

  it("aggregates raw counts, then rounds once", () => {
    const total = sumScores([
      { complied: 25, notApplicable: 12, assignedTotal: 37 },
      { complied: 24, notApplicable: 11, assignedTotal: 37 },
    ]);
    expect(total).toEqual({ complied: 49, notApplicable: 23, assignedTotal: 74 });
    expect(formatScore(total)).toBe("97.3%");
  });
});
