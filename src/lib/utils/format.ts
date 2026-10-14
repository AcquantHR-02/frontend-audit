import { format, parseISO } from "date-fns";
import type { IsoDate, IsoDateTime } from "@/types/domain";

/** "14 Oct 2026" */
export function formatDate(value: IsoDate | IsoDateTime | null | undefined): string {
  return value ? format(parseISO(value), "d MMM yyyy") : "—";
}

/** "14 Oct 2026, 15:42" */
export function formatDateTime(value: IsoDateTime | null | undefined): string {
  return value ? format(parseISO(value), "d MMM yyyy, HH:mm") : "—";
}

/** Date range for activity periods / windows: "1 Jan – 30 Jun 2026" (year collapsed when shared). */
export function formatDateRange(start: IsoDate | null, end: IsoDate | null): string {
  if (!start || !end) return "—";
  const s = parseISO(start);
  const e = parseISO(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${format(s, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
}

/** Indian digit grouping: 1,23,456 */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** "AR" initials for avatars. */
export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
