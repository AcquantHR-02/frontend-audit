import { delay, HttpResponse } from "msw";
import { env } from "@/config/env";
import type { ApiError, Page } from "@/types/api";

/** Prefix a path with the API base URL so handlers match exactly what RTK Query calls. */
export const apiUrl = (path: string) => `${env.apiBaseUrl}${path}`;

/** Realistic latency so loading states are visible during development. */
export const networkDelay = () => delay(200 + Math.random() * 300);

export function errorResponse(status: number, message: string, extra: Partial<ApiError> = {}) {
  return HttpResponse.json<ApiError>({ status, message, ...extra }, { status });
}

export const nowIso = () => new Date().toISOString();
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Spring-style `sort=field,asc|desc` comparator; strings compare case-insensitively, nulls last. */
function sortItems<T>(items: T[], sort: string | null): T[] {
  if (!sort) return items;
  const [field, direction = "asc"] = sort.split(",");
  const factor = direction === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = (a as Record<string, unknown>)[field];
    const bv = (b as Record<string, unknown>)[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return String(av).localeCompare(String(bv), undefined, { sensitivity: "base", numeric: true }) * factor;
  });
}

/** Spring-style pagination + case-insensitive search over the given fields + sorting. */
export function paginate<T>(items: T[], url: URL, searchFields: (keyof T)[] = [], defaultSort?: string): Page<T> {
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));
  const size = Math.min(200, Math.max(1, Number(url.searchParams.get("size") ?? 20)));
  const search = url.searchParams.get("search")?.trim().toLowerCase();

  const filtered = search
    ? items.filter((item) =>
        searchFields.some((field) =>
          String(item[field] ?? "")
            .toLowerCase()
            .includes(search),
        ),
      )
    : items;
  const sorted = sortItems(filtered, url.searchParams.get("sort") ?? defaultSort ?? null);

  return {
    content: sorted.slice(page * size, page * size + size),
    page,
    size,
    totalElements: sorted.length,
    totalPages: Math.max(1, Math.ceil(sorted.length / size)),
  };
}

/** Reads `?active=true|false` style boolean filters; null when absent. */
export function boolParam(url: URL, name: string): boolean | null {
  const value = url.searchParams.get(name);
  return value === "true" ? true : value === "false" ? false : null;
}
