// @vitest-environment node -- API tests: native fetch/FormData (jsdom FormData hangs with Node fetch)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { dashboardApi } from "@/features/dashboard";
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

describe("reports (§10, §12.8)", () => {
  it("rolls up raw counts per party and sums them for the grand total", async () => {
    const store = await signIn("auditor@acquanthr.test");
    const rollup = await store
      .dispatch(reportsApi.endpoints.getScoreRollup.initiate({ from: "2026-07-01", to: "2026-07-31" }))
      .unwrap();
    expect(rollup.rows.length).toBe(19); // every vendor has a published July run
    const sum = rollup.rows.reduce((n, r) => n + r.score.assignedTotal, 0);
    expect(rollup.total.assignedTotal).toBe(sum);
    const rathna = rollup.rows.find((r) => r.partyName === "Rathna")!;
    expect(rathna.units).toHaveLength(10);
    expect(rathna.units.reduce((n, u) => n + u.score.complied, 0)).toBe(rathna.score.complied);
  });

  it("scopes the dashboard to the vendor's own runs (§18)", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const vendor = await signIn("vendor@rathna.test");
    const all = await auditor.dispatch(dashboardApi.endpoints.getDashboard.initiate()).unwrap();
    const own = await vendor.dispatch(dashboardApi.endpoints.getDashboard.initiate()).unwrap();
    expect(own.totalRuns).toBeLessThan(all.totalRuns);
    expect(own.recentRuns.every((r) => r.vendorId === "ven-rathna")).toBe(true);
  });
});
