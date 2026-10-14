import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { Act, ActSummary } from "@/types/domain";

export type ActInput = Pick<Act, "name" | "shortName" | "category">;
export type ActListParams = PageRequest & { active?: boolean };

export const actsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getActs: build.query<Page<ActSummary>, ActListParams | void>({
      query: (params) => ({ url: "/acts", params: params ?? undefined }),
      providesTags: (result) => providesPage("Act", result),
    }),
    createAct: build.mutation<ActSummary, ActInput>({
      query: (body) => ({ url: "/acts", method: "POST", body }),
      invalidatesTags: [{ type: "Act", id: "LIST" }],
    }),
    updateAct: build.mutation<ActSummary, ActInput & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/acts/${id}`, method: "PUT", body }),
      // Short names are shown on checklist rows.
      invalidatesTags: (_r, _e, { id }) => [{ type: "Act", id }, "ChecklistItem", "PEChecklistItem"],
    }),
    setActStatus: build.mutation<ActSummary, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({ url: `/acts/${id}/status`, method: "PATCH", body: { isActive } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Act", id }],
    }),
  }),
});

export const { useGetActsQuery, useCreateActMutation, useUpdateActMutation, useSetActStatusMutation } = actsApi;
