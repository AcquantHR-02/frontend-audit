/**
 * Assignment versioning rules — spec §7A Lock 7 and §15.9. Pure functions (dates are ISO yyyy-mm-dd).
 */
import type { AssignmentStatus, EffectivePeriod, IsoDate } from "@/types/domain";

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function assignmentStatus(period: EffectivePeriod, today: IsoDate): AssignmentStatus {
  if (period.effectiveFrom > today) return "FUTURE";
  if (period.effectiveTo !== null && period.effectiveTo < today) return "ENDED";
  return "CURRENT";
}

/** Do two effective periods share at least one day? (null end = open-ended) */
export function periodsOverlap(a: EffectivePeriod, b: EffectivePeriod): boolean {
  const aEnd = a.effectiveTo ?? "9999-12-31";
  const bEnd = b.effectiveTo ?? "9999-12-31";
  return a.effectiveFrom <= bEnd && b.effectiveFrom <= aEnd;
}

export type CoverageResult<T> =
  | { ok: true; version: T }
  | { ok: false; code: "ASSIGNMENT_NOT_FOUND" | "ASSIGNMENT_CHANGED_IN_PERIOD"; message: string };

/**
 * §15.9 — exactly ONE version must cover the complete Activity Period.
 * Two-tier error: no assignment at all vs. assignment changed within the period. Never merged.
 */
export function resolveCoveringVersion<T extends EffectivePeriod>(
  versions: T[],
  periodStart: IsoDate,
  periodEnd: IsoDate,
): CoverageResult<T> {
  if (versions.length === 0) {
    return { ok: false, code: "ASSIGNMENT_NOT_FOUND", message: "No checklist assignment exists." };
  }
  const covering = versions.find(
    (v) => v.effectiveFrom <= periodStart && (v.effectiveTo === null || v.effectiveTo >= periodEnd),
  );
  return covering
    ? { ok: true, version: covering }
    : {
        ok: false,
        code: "ASSIGNMENT_CHANGED_IN_PERIOD",
        message: "Checklist assignment changed within the Activity Period. Stabilise before creating the audit run.",
      };
}

/**
 * New checklist version: must start after the current open version starts;
 * the current version is closed the day before. Returns the end date for the previous version.
 */
export function planNewVersion<T extends EffectivePeriod>(
  versions: T[],
  effectiveFrom: IsoDate,
): { ok: true; previous: T | null; previousEndsOn: IsoDate | null } | { ok: false; message: string } {
  const open = versions.find((v) => v.effectiveTo === null) ?? null;
  if (open && effectiveFrom <= open.effectiveFrom) {
    return {
      ok: false,
      message: `The new version must start after ${open.effectiveFrom}, when the current one started.`,
    };
  }
  return { ok: true, previous: open, previousEndsOn: open ? addDays(effectiveFrom, -1) : null };
}
