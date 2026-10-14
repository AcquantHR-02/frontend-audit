import { baseApi, providesPage } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { AuditItemResult, AuditRunView, AuditType, Cadence, RunPhase, TriggerOccasion } from "@/types/domain";

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
  }),
});

export const {
  useGetAuditRunsQuery,
  useGetAuditRunQuery,
  useGetRunItemsQuery,
  usePreviewRunChecklistQuery,
  useCreateAuditRunMutation,
} = auditRunsApi;
