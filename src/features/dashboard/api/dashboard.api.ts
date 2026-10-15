import { baseApi } from "@/store";
import type { AuditRunView, RunPhase, ScoreCounts } from "@/types/domain";

export interface DashboardDeadline {
  runId: string;
  runCode: string;
  partyName: string;
  unitCode: string;
  kind: "WINDOW_1_OPENS" | "WINDOW_1_CLOSES" | "WINDOW_2_CLOSES";
  date: string;
  /** Whole days from today (0 = today). */
  daysLeft: number;
}

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
  /** Window dates in the next 30 days, soonest first (max 6). */
  deadlines: DashboardDeadline[];
  /** Not-complied items in published runs, grouped by Act, most first. */
  ncByAct: { act: string; count: number }[];
  /** Open findings by age since opened; `oldestDays` null when none are open. */
  findingsAging: { buckets: { label: string; count: number }[]; oldestDays: number | null };
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
