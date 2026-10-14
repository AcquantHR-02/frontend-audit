import { delay, HttpResponse } from "msw";
import { env } from "@/config/env";
import type { ApiError, Page } from "@/types/api";

/** Prefix a path with the API base URL so handlers match exactly what RTK Query calls. */
export const apiUrl = (path: string) => `${env.apiBaseUrl}${path}`;

/** Realistic latency so loading states are visible during development. */
export const networkDelay = () => delay(250 + Math.random() * 350);

export function errorResponse(status: number, message: string, extra: Partial<ApiError> = {}) {
  return HttpResponse.json<ApiError>({ status, message, ...extra }, { status });
}

/** Spring-style pagination + case-insensitive search over the given fields. */
export function paginate<T>(items: T[], url: URL, searchFields: (keyof T)[] = []): Page<T> {
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

  return {
    content: filtered.slice(page * size, page * size + size),
    page,
    size,
    totalElements: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / size)),
  };
}
