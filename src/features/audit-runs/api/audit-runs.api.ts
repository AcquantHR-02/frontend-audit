import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type {
  AuditItemResult,
  AuditRunView,
  AuditType,
  Cadence,
  ComplianceStatus,
  EvidenceRecord,
  RunPhase,
  TriggerOccasion,
} from "@/types/domain";

export interface RunScope {
  auditType: AuditType;
  vendorId?: string;
  peId?: string;
  peUnitId: string;
  activityPeriodStart: string;
  activityPeriodEnd: string;
}

export interface PreviewItem {
  id: string;
  description: string;
  cadence: Cadence;
  actShortName: string;
  willCarryForward: boolean;
}

export interface PeriodInput {
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
}

export interface CreateRunRequest extends RunScope {
  executionWindowStart: string;
  executionWindowEnd: string;
  window1Start: string;
  window1End: string;
  triggerOccasion?: TriggerOccasion;
  periodicItems: { checklistItemId: string; periods: PeriodInput[] }[];
}

export interface PublishCheck {
  canPublish: boolean;
  blocking: string[];
  warnings: string[];
  findingsToOpen: number;
}

export interface ReviewRequest {
  airId: string;
  runId: string;
  complianceStatus: ComplianceStatus;
  auditRemarks: string;
  validTo?: string | null;
}

export type AuditRunListParams = PageRequest & { auditType?: AuditType; phase?: RunPhase };

export const auditRunsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getAuditRuns: build.query<Page<AuditRunView>, AuditRunListParams>({
      query: (params) => ({ url: "/audit-runs", params }),
      providesTags: (result) => providesPage("AuditRun", result),
    }),
    getAuditRun: build.query<AuditRunView, string>({
      query: (id) => `/audit-runs/${id}`,
      providesTags: (_r, _e, id) => [{ type: "AuditRun", id }],
    }),
    getRunItems: build.query<AuditItemResult[], string>({
      query: (id) => `/audit-runs/${id}/items`,
      providesTags: (_r, _e, id) => [{ type: "AuditItem", id: `run:${id}` }],
    }),
    /** Read-only POST: resolves the checklist version (§15.9) and carry-forward for the wizard. */
    previewRunChecklist: build.query<{ items: PreviewItem[] }, RunScope>({
      query: (body) => ({ url: "/audit-runs/checklist-preview", method: "POST", body }),
      keepUnusedDataFor: 0,
    }),
    createAuditRun: build.mutation<AuditRunView, CreateRunRequest>({
      query: (body) => ({ url: "/audit-runs", method: "POST", body }),
      invalidatesTags: [{ type: "AuditRun", id: "LIST" }, "Dashboard"],
    }),

    /* ----- Workspace: evidence, review, phases ----- */
    getAirEvidence: build.query<EvidenceRecord[], string>({
      query: (airId) => `/airs/${airId}/evidence`,
      providesTags: (_r, _e, airId) => [{ type: "Evidence", id: airId }],
    }),
    /** Multipart: files[], partyRemarks, naProposedByParty. */
    uploadEvidence: build.mutation<EvidenceRecord, { airId: string; runId: string; form: FormData }>({
      query: ({ airId, form }) => ({ url: `/airs/${airId}/evidence`, method: "POST", body: form }),
      invalidatesTags: (_r, _e, { airId, runId }) => [
        { type: "Evidence", id: airId },
        { type: "AuditItem", id: `run:${runId}` },
        { type: "AuditRun", id: runId },
      ],
    }),
    reviewAir: build.mutation<AuditItemResult, ReviewRequest>({
      query: ({ airId, complianceStatus, auditRemarks, validTo }) => ({
        url: `/airs/${airId}/review`,
        method: "PATCH",
        body: { complianceStatus, auditRemarks, validTo },
      }),
      invalidatesTags: (_r, _e, { airId, runId }) => [
        { type: "Evidence", id: airId },
        { type: "AuditItem", id: `run:${runId}` },
        { type: "AuditRun", id: runId },
        { type: "AuditRun", id: "LIST" },
      ],
    }),
    startReview: build.mutation<AuditRunView, string>({
      query: (runId) => ({ url: `/audit-runs/${runId}/start-review`, method: "POST" }),
      invalidatesTags: (_r, _e, runId) => [
        { type: "AuditRun", id: runId },
        { type: "AuditRun", id: "LIST" },
      ],
    }),
    endReview: build.mutation<AuditRunView, { runId: string; window2Start?: string; window2End?: string }>({
      query: ({ runId, ...body }) => ({ url: `/audit-runs/${runId}/end-review`, method: "POST", body }),
      invalidatesTags: (_r, _e, { runId }) => [
        { type: "AuditRun", id: runId },
        { type: "AuditRun", id: "LIST" },
      ],
    }),
    closeWindow2: build.mutation<AuditRunView, string>({
      query: (runId) => ({ url: `/audit-runs/${runId}/close-window2`, method: "POST" }),
      invalidatesTags: (_r, _e, runId) => [
        { type: "AuditRun", id: runId },
        { type: "AuditRun", id: "LIST" },
      ],
    }),
    getPublishCheck: build.query<PublishCheck, string>({
      query: (runId) => `/audit-runs/${runId}/publish-check`,
      keepUnusedDataFor: 0,
    }),
    publishRun: build.mutation<AuditRunView, string>({
      query: (runId) => ({ url: `/audit-runs/${runId}/publish`, method: "POST" }),
      invalidatesTags: (_r, _e, runId) => [
        { type: "AuditRun", id: runId },
        { type: "AuditRun", id: "LIST" },
        { type: "AuditItem", id: `run:${runId}` },
        "Finding",
        "Dashboard",
      ],
    }),
  }),
});

export const {
  useGetAuditRunsQuery,
  useGetAuditRunQuery,
  useGetRunItemsQuery,
  usePreviewRunChecklistQuery,
  useCreateAuditRunMutation,
  useGetAirEvidenceQuery,
  useUploadEvidenceMutation,
  useReviewAirMutation,
  useStartReviewMutation,
  useEndReviewMutation,
  useCloseWindow2Mutation,
  useGetPublishCheckQuery,
  usePublishRunMutation,
} = auditRunsApi;
