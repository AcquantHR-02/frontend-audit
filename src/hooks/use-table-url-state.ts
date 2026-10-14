"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import type { PageRequest } from "@/types/api";

export const PAGE_SIZES = [10, 20, 50, 100] as const;

const tableParsers = {
  page: parseAsInteger.withDefault(1), // 1-based in the URL (human friendly), 0-based to the API
  size: parseAsInteger.withDefault(20),
  search: parseAsString.withDefault(""),
  sort: parseAsString.withDefault(""), // "field,asc|desc"
};

/**
 * Page / size / search / sort for a server-paginated table, stored in the URL.
 * Filtered views are bookmarkable and survive refresh and back/forward.
 */
export function useTableUrlState(defaultSort = "") {
  const [state, setState] = useQueryStates(tableParsers, { history: "replace" });
  const sort = state.sort || defaultSort;

  const request: PageRequest = {
    page: Math.max(0, state.page - 1),
    size: state.size,
    search: state.search || undefined,
    sort: sort || undefined,
  };

  return {
    ...state,
    sort,
    request,
    setPage: (page: number) => setState({ page }),
    setSize: (size: number) => setState({ size, page: 1 }),
    setSearch: (search: string) => setState({ search, page: 1 }),
    setSort: (next: string) => setState({ sort: next, page: 1 }),
    /** Call when any page-specific filter changes, so the user isn't stranded on page 7 of 2. */
    resetPage: () => setState({ page: 1 }),
  };
}
