/**
 * Audit run rules — spec §4 (windows), §6 (materialisation). Pure functions; dates are ISO yyyy-mm-dd.
 */
import type { IsoDate, RunPhase } from "@/types/domain";
import { addDays } from "./assignments";

export interface RunDates {
  activityPeriodStart: IsoDate;
  activityPeriodEnd: IsoDate;
  executionWindowStart: IsoDate;
  executionWindowEnd: IsoDate;
  window1Start: IsoDate;
  window1End: IsoDate;
}

export type RunDateErrors = Partial<Record<keyof RunDates, string>>;

const labels: Record<keyof RunDates, string> = {
  activityPeriodStart: "activity period start",
  activityPeriodEnd: "activity period end",
  executionWindowStart: "execution window start",
  executionWindowEnd: "execution window end",
  window1Start: "Window 1 start",
  window1End: "Window 1 end",
};

/** §4 / §12.6 — date rules checked before a run can be created. */
export function validateRunDates(d: Partial<RunDates>): RunDateErrors {
  const e: RunDateErrors = {};
  for (const key of Object.keys(labels) as (keyof RunDates)[]) {
    if (!d[key]) e[key] = `Select the ${labels[key]}`;
  }
  if (Object.keys(e).length) return e;
  const r = d as RunDates;
  if (r.activityPeriodEnd < r.activityPeriodStart) e.activityPeriodEnd = "Must be on or after the start date";
  if (r.executionWindowStart < r.activityPeriodEnd)
    e.executionWindowStart = "The audit can't start before the activity period ends";
  if (r.executionWindowEnd < r.executionWindowStart) e.executionWindowEnd = "Must be on or after the start date";
  if (r.window1Start < r.executionWindowStart || r.window1Start > r.executionWindowEnd)
    e.window1Start = "Window 1 must fall inside the execution window";
  if (r.window1End < r.window1Start) e.window1End = "Must be on or after the Window 1 start";
  else if (r.window1End > r.executionWindowEnd) e.window1End = "Window 1 must end inside the execution window";
  return e;
}

/** Suggested windows after the activity period: execution = next 30 days, Window 1 = first 10 days. */
export function suggestWindows(activityPeriodEnd: IsoDate) {
  const executionWindowStart = addDays(activityPeriodEnd, 1);
  return {
    executionWindowStart,
    executionWindowEnd: addDays(executionWindowStart, 29),
    window1Start: executionWindowStart,
    window1End: addDays(executionWindowStart, 9),
  };
}

/**
 * §4 — phase derived from window dates + publish state (never stored).
 * `reviewStart` / `finalReviewStart` record an auditor closing a window early.
 */
export function deriveRunPhase(
  run: Pick<RunDates, "window1Start" | "window1End"> & {
    window2Start: IsoDate | null;
    window2End: IsoDate | null;
    publishedAt: string | null;
    reviewStart?: IsoDate | null;
    finalReviewStart?: IsoDate | null;
  },
  today: IsoDate,
): RunPhase {
  if (run.publishedAt) return "PUBLISHED";
  if (run.finalReviewStart && run.finalReviewStart <= today) return "FINAL_REVIEW";
  if (run.window2Start && run.window2End) {
    if (today > run.window2End) return "FINAL_REVIEW";
    if (today >= run.window2Start) return "WINDOW_2";
    return "REVIEW";
  }
  if (run.reviewStart && run.reviewStart <= today) return "REVIEW";
  if (today < run.window1Start) return "SCHEDULED";
  if (today <= run.window1End) return "WINDOW_1";
  return "REVIEW";
}

export interface Period {
  periodStart: IsoDate;
  periodEnd: IsoDate;
}

export type PeriodPreset = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "WHOLE";

const monthsPerPreset: Record<Exclude<PeriodPreset, "WHOLE">, number> = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6 };

/**
 * Bulk-add convenience (§6 Step 2a): calendar-aligned periods overlapping the activity period,
 * clipped to it. Quarters/halves follow the Indian FY grid (Apr–Jun…, Apr–Sep / Oct–Mar).
 * Not a rules engine: the auditor reviews and edits the result.
 */
export function generatePeriods(start: IsoDate, end: IsoDate, preset: PeriodPreset): Period[] {
  if (!start || !end || end < start) return [];
  if (preset === "WHOLE") return [{ periodStart: start, periodEnd: end }];
  const step = monthsPerPreset[preset];
  const s = new Date(`${start}T00:00:00Z`);
  const monthIndex = s.getUTCMonth();
  const offset = (((monthIndex - 3) % step) + step) % step; // align to April
  let cursor = new Date(Date.UTC(s.getUTCFullYear(), monthIndex - offset, 1));
  const periods: Period[] = [];
  while (cursor.toISOString().slice(0, 10) <= end) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + step, 1));
    const bucketStart = cursor.toISOString().slice(0, 10);
    const bucketEnd = addDays(next.toISOString().slice(0, 10), -1);
    periods.push({
      periodStart: bucketStart < start ? start : bucketStart,
      periodEnd: bucketEnd > end ? end : bucketEnd,
    });
    cursor = next;
  }
  return periods;
}
