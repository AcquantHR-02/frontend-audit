import { baseApi } from "@/store";
import type { Page, PageRequest } from "@/types/api";
import type { AuditRunView, AuditType, ScoreCounts } from "@/types/domain";

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

interface RunScore {
  runId: string;
  code: string;
  periodEnd: string;
  score: ScoreCounts;
}

/** One audited party's history (GET /reports/scorecard). */
export interface PartyScorecard {
  party: { id: string; name: string; auditType: AuditType; legalName: string | null };
  summary: {
    totalRuns: number;
    publishedRuns: number;
    inProgressRuns: number;
    overall: ScoreCounts;
    latest: RunScore | null;
    previous: RunScore | null;
    openFindings: number;
    resolvedFindings: number;
    oldestOpenDays: number | null;
  };
  trend: { month: string; score: ScoreCounts }[];
  units: {
    unitId: string;
    unitCode: string;
    unitName: string;
    peName: string;
    runCount: number;
    overall: ScoreCounts;
    latest: RunScore | null;
  }[];
  ncByAct: { act: string; count: number }[];
  /** Requirements not complied in two or more published runs. */
  repeatNc: { requirement: string; act: string; count: number; lastPeriodEnd: string }[];
  /** Latest 12 runs, newest activity period first. */
  runs: AuditRunView[];
  /** Oldest open findings first (max 6). */
  openFindings: { id: string; requirement: string; act: string; unitCode: string; runCode: string; ageDays: number }[];
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
    getScorecard: build.query<PartyScorecard, { auditType: AuditType; partyId: string }>({
      query: (params) => ({ url: "/reports/scorecard", params }),
      providesTags: ["Report", { type: "AuditRun", id: "LIST" }, "Finding"],
    }),
    getAuditTrail: build.query<Page<AuditEvent>, PageRequest & { action?: string }>({
      query: (params) => ({ url: "/audit-trail", params }),
      providesTags: ["AuditTrail"],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetScoreRollupQuery, useGetScorecardQuery, useGetAuditTrailQuery } = reportsApi;
