import { baseApi } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { AuditType, ScoreCounts } from "@/types/domain";

export interface ScoreRollup {
  rows: {
    id: string;
    partyName: string;
    auditType: AuditType;
    score: ScoreCounts;
    units: { unitCode: string; unitName: string; score: ScoreCounts }[];
  }[];
  total: ScoreCounts;
  runCount: number;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}

export const reportsApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getScoreRollup: build.query<ScoreRollup, { peId?: string; from?: string; to?: string; auditType?: AuditType }>({
      query: (params) => ({ url: "/reports/score-rollup", params }),
      providesTags: ["Report", { type: "AuditRun", id: "LIST" }],
    }),
    getAuditTrail: build.query<Page<AuditEvent>, PageRequest & { action?: string }>({
      query: (params) => ({ url: "/audit-trail", params }),
      providesTags: ["AuditTrail"],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetScoreRollupQuery, useGetAuditTrailQuery } = reportsApi;
