import { baseApi } from "@/store";
import type { AuditRunView, RunPhase, ScoreCounts } from "@/types/domain";

export interface DashboardData {
  runsByPhase: Record<RunPhase, number>;
  totalRuns: number;
  openFindings: number;
  awaitingReview: number;
  itemsToUpload: number;
  publishedThisFy: number;
  publishedScore: ScoreCounts;
  partyScores: { name: string; score: ScoreCounts }[];
  trend: { month: string; score: ScoreCounts }[];
  recentRuns: AuditRunView[];
}

export const dashboardApi = baseApi.injectEndpoints({
  // Fast Refresh re-evaluates this module in dev; allow re-registering the same endpoints.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getDashboard: build.query<DashboardData, void>({
      query: () => "/dashboard",
      providesTags: ["Dashboard", { type: "AuditRun", id: "LIST" }, { type: "Finding", id: "LIST" }],
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
