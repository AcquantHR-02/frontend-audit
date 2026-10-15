// @vitest-environment node -- API tests: native fetch (jsdom fetch hangs with MSW in Node)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { reportsApi } from "./reports.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function signIn(email: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  return store;
}

const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);

describe("party scorecard", () => {
  it("summarises a vendor's published audits, units and findings", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const card = await auditor
      .dispatch(reportsApi.endpoints.getScorecard.initiate({ auditType: "VENDOR", partyId: "ven-bellfast" }))
      .unwrap();

    expect(card.party).toMatchObject({ id: "ven-bellfast", auditType: "VENDOR" });
    const published = card.runs.filter((r) => r.phase === "PUBLISHED");
    expect(card.summary.publishedRuns).toBeGreaterThanOrEqual(published.length);
    // Newest activity period first; "latest" is the newest published run.
    expect(card.runs.map((r) => r.activityPeriodEnd)).toEqual(
      [...card.runs.map((r) => r.activityPeriodEnd)].sort().reverse(),
    );
    expect(card.summary.latest?.runId).toBe(published[0].id);
    // Raw counts are summed across runs (never averaged percentages).
    expect(card.summary.overall.assignedTotal).toBe(card.trend.reduce((sum, t) => sum + t.score.assignedTotal, 0));
    expect(card.units.length).toBeGreaterThan(0);
    expect(card.repeatNc.every((r) => r.count >= 2)).toBe(true);
  });

  it("shows a vendor only its own scorecard", async () => {
    const vendor = await signIn("vendor@rathna.test");
    await expect(
      vendor
        .dispatch(reportsApi.endpoints.getScorecard.initiate({ auditType: "VENDOR", partyId: "ven-rathna" }))
        .unwrap(),
    ).resolves.toMatchObject({ party: { id: "ven-rathna" } });
    expect(
      await failure(
        vendor
          .dispatch(reportsApi.endpoints.getScorecard.initiate({ auditType: "VENDOR", partyId: "ven-bellfast" }))
          .unwrap(),
      ),
    ).toMatchObject({ status: 404 });
  });
});
