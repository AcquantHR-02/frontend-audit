import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { Cadence, ChecklistItem, ChecklistItemView } from "@/types/domain";

/** Vendor-side (ChecklistItem) and PE-side (PEChecklistItem) masters share one shape and one UI. */
export type ChecklistKind = "vendor" | "pe";

export const checklistConfig = {
  vendor: { url: "/checklist-items", tag: "ChecklistItem" },
  pe: { url: "/pe-checklist-items", tag: "PEChecklistItem" },
} as const;

export type ChecklistItemInput = Pick<ChecklistItem, "actId" | "stateId" | "description" | "cadence">;
export type ChecklistListParams = PageRequest & {
  active?: boolean;
  actId?: string;
  /** a state id, or "NATIONAL" */
  stateId?: string;
  cadence?: Cadence;
  /** Comma-separated state ids: returns items for these states plus NATIONAL items. */
  forStates?: string;
};

export const checklistItemsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getChecklistItems: build.query<Page<ChecklistItemView>, { kind: ChecklistKind; params: ChecklistListParams }>({
      query: ({ kind, params }) => ({ url: checklistConfig[kind].url, params }),
      providesTags: (result, _e, { kind }) => providesPage(checklistConfig[kind].tag, result),
    }),
    createChecklistItem: build.mutation<ChecklistItemView, { kind: ChecklistKind; body: ChecklistItemInput }>({
      query: ({ kind, body }) => ({ url: checklistConfig[kind].url, method: "POST", body }),
      // Item counts are shown on Acts.
      invalidatesTags: (_r, _e, { kind }) => [{ type: checklistConfig[kind].tag, id: "LIST" }, "Act"],
    }),
    updateChecklistItem: build.mutation<
      ChecklistItemView,
      { kind: ChecklistKind; id: string; body: ChecklistItemInput }
    >({
      query: ({ kind, id, body }) => ({ url: `${checklistConfig[kind].url}/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { kind, id }) => [{ type: checklistConfig[kind].tag, id }, "Act"],
    }),
    setChecklistItemStatus: build.mutation<ChecklistItemView, { kind: ChecklistKind; id: string; isActive: boolean }>({
      query: ({ kind, id, isActive }) => ({
        url: `${checklistConfig[kind].url}/${id}/status`,
        method: "PATCH",
        body: { isActive },
      }),
      invalidatesTags: (_r, _e, { kind, id }) => [{ type: checklistConfig[kind].tag, id }],
    }),
  }),
});

export const {
  useGetChecklistItemsQuery,
  useCreateChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useSetChecklistItemStatusMutation,
} = checklistItemsApi;
