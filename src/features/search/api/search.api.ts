import { baseApi } from "@/store";

export type SearchGroupType = "runs" | "findings" | "vendors" | "pes" | "users";

export interface SearchResults {
  groups: {
    type: SearchGroupType;
    label: string;
    items: { id: string; title: string; subtitle: string; href: string }[];
  }[];
}

export const searchApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    globalSearch: build.query<SearchResults, string>({
      query: (q) => ({ url: "/search", params: { q } }),
      keepUnusedDataFor: 30,
    }),
  }),
});

export const { useGlobalSearchQuery } = searchApi;
