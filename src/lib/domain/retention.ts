/**
 * Retention — spec §12.14: 2 financial years rolling (Indian FY, 1 Apr – 31 Mar).
 * Interpretation (confirm with spec owner): data from FY N becomes purge-eligible on the
 * 1 April two years after FY N ends. E.g. FY 2024-25 (ends 31 Mar 2025) → eligible 1 Apr 2027.
 * Pre-purge notices go out 30 and 7 days before the purge date.
 */
import type { IsoDate } from "@/types/domain";

/** Next 1 April on or after `today`. */
export function nextPurgeDate(today: IsoDate): IsoDate {
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-04-01`;
  return today <= thisYear ? thisYear : `${year + 1}-04-01`;
}

/** Runs whose activity period ended on or before this date are purged on `purgeDate`. */
export function purgeCutoff(purgeDate: IsoDate): IsoDate {
  return `${Number(purgeDate.slice(0, 4)) - 2}-03-31`;
}

export function daysUntil(from: IsoDate, to: IsoDate) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "30-day" / "7-day" notice when we're inside a notice window, else null. */
export function purgeNotice(today: IsoDate): { days: number; level: "30" | "7" } | null {
  const days = daysUntil(today, nextPurgeDate(today));
  if (days <= 7) return { days, level: "7" };
  if (days <= 30) return { days, level: "30" };
  return null;
}

/** "FY 2024-25" for a date. */
export function fyLabel(date: IsoDate) {
  const y = Number(date.slice(0, 4));
  const start = Number(date.slice(5, 7)) >= 4 ? y : y - 1;
  return `FY ${start}-${String(start + 1).slice(2)}`;
}
