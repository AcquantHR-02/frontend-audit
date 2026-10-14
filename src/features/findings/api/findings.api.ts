import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { AuditType, FindingAttachment, FindingDetail, FindingStatus, FindingView } from "@/types/domain";

export type FindingListParams = PageRequest & { status?: FindingStatus; auditType?: AuditType; runId?: string };

export const findingsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getFindings: build.query<Page<FindingView>, FindingListParams>({
      query: (params) => ({ url: "/findings", params }),
      providesTags: (result) => providesPage("Finding", result),
    }),
    getFindingsSummary: build.query<{ open: number; resolved: number; awaitingReview: number }, void>({
      query: () => "/findings/summary",
      providesTags: [{ type: "Finding", id: "SUMMARY" }],
    }),
    getFinding: build.query<FindingDetail, string>({
      query: (id) => `/findings/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Finding", id }],
    }),
    addRemediation: build.mutation<FindingAttachment, { id: string; form: FormData }>({
      query: ({ id, form }) => ({ url: `/findings/${id}/attachments`, method: "POST", body: form }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Finding", id },
        { type: "Finding", id: "LIST" },
        { type: "Finding", id: "SUMMARY" },
      ],
    }),
    updateFinding: build.mutation<FindingView, { id: string; status?: FindingStatus; remarks?: string | null }>({
      query: ({ id, ...body }) => ({ url: `/findings/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Finding", id },
        { type: "Finding", id: "LIST" },
        { type: "Finding", id: "SUMMARY" },
        "Dashboard",
      ],
    }),
  }),
});

export const {
  useGetFindingsQuery,
  useGetFindingsSummaryQuery,
  useGetFindingQuery,
  useAddRemediationMutation,
  useUpdateFindingMutation,
} = findingsApi;
