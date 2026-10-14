/**
 * Score formula — spec §10.
 *   Score = (Complied + Not Applicable) / Assigned Total
 * Rules: store raw counts, round only at display, one decimal, round half-up,
 * always show the decimal (100 → "100.0%"). Grand totals sum raw counts, then round once.
 */

export interface ScoreInput {
  complied: number;
  notApplicable: number;
  assignedTotal: number;
}

/**
 * Score in tenths of a percent (e.g. 946 = 94.6%), or null when nothing is assigned.
 * Pure integer arithmetic, so exact .x5 boundaries can't be skewed by floating-point error.
 */
export function scoreInTenths({ complied, notApplicable, assignedTotal }: ScoreInput): number | null {
  if (assignedTotal <= 0) return null;
  const passed = complied + notApplicable;
  // round-half-up(passed / total × 1000) == floor((2·passed·1000 + total) / (2·total))
  return Math.floor((2 * passed * 1000 + assignedTotal) / (2 * assignedTotal));
}

/** "94.6%" — or "—" when the run has no AIRs yet. */
export function formatScore(input: ScoreInput): string {
  const tenths = scoreInTenths(input);
  return tenths === null ? "—" : `${(tenths / 10).toFixed(1)}%`;
}

/** Aggregate raw counts across runs/vendors before rounding (never average rounded scores). */
export function sumScores(inputs: ScoreInput[]): ScoreInput {
  return inputs.reduce(
    (acc, s) => ({
      complied: acc.complied + s.complied,
      notApplicable: acc.notApplicable + s.notApplicable,
      assignedTotal: acc.assignedTotal + s.assignedTotal,
    }),
    { complied: 0, notApplicable: 0, assignedTotal: 0 },
  );
}
