// @vitest-environment node -- API tests: native fetch/FormData (jsdom FormData hangs with Node fetch)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assignmentsApi } from "@/features/assignments";
import { authApi } from "@/features/auth";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { auditRunsApi, type CreateRunRequest } from "./audit-runs.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);

async function auditor() {
  const store = makeStore();
  await store
    .dispatch(authApi.endpoints.login.initiate({ email: "auditor@acquanthr.test", password: "Password@123" }))
    .unwrap();
  return store;
}

const bellfastJuly: CreateRunRequest = {
  auditType: "VENDOR",
  vendorId: "ven-bellfast",
  peUnitId: "unit-hrh",
  activityPeriodStart: "2026-07-01",
  activityPeriodEnd: "2026-07-31",
  executionWindowStart: "2026-08-01",
  executionWindowEnd: "2026-08-30",
  window1Start: "2026-08-01",
  window1End: "2026-08-10",
  periodicItems: [],
};

describe("audit run creation (§6, §13, §15.9)", () => {
  it("auto-creates LIFETIME/ONE_TIME items and only the PERIODIC periods the auditor chose", async () => {
    const store = await auditor();
    const { items } = await store.dispatch(auditRunsApi.endpoints.previewRunChecklist.initiate(bellfastJuly)).unwrap();
    const periodic = items.filter((i) => i.cadence === "PERIODIC");
    const automatic = items.length - periodic.length;

    const run = await store
      .dispatch(
        auditRunsApi.endpoints.createAuditRun.initiate({
          ...bellfastJuly,
          periodicItems: [
            { checklistItemId: periodic[0].id, periods: [{ periodStart: "2026-07-01", periodEnd: "2026-07-31" }] },
          ],
        }),
      )
      .unwrap();

    expect(run.code).toMatch(/^AR-2026-\d{4}$/);
    expect(run.score.assignedTotal).toBe(automatic + 1);
    const airs = await store.dispatch(auditRunsApi.endpoints.getRunItems.initiate(run.id)).unwrap();
    expect(airs.every((a) => a.submissionStatus === "PENDING" && a.descriptionSnapshot.length > 0)).toBe(true);
    expect(airs.filter((a) => a.periodStart)).toHaveLength(1);
  });

  it("rejects an overlapping run for the same party and unit", async () => {
    const store = await auditor();
    const error = await failure(store.dispatch(auditRunsApi.endpoints.createAuditRun.initiate(bellfastJuly)).unwrap());
    expect(error).toMatchObject({ status: 409, code: "RUN_OVERLAP" });
  });

  it("blocks when the checklist assignment changed within the activity period", async () => {
    const store = await auditor();
    const scope = { vendorId: "ven-rathna", peUnitId: "unit-mkl" };
    const [current] = await store
      .dispatch(assignmentsApi.endpoints.getVendorChecklistVersions.initiate(scope))
      .unwrap();
    await store
      .dispatch(
        assignmentsApi.endpoints.saveVendorChecklistVersion.initiate({
          ...scope,
          effectiveFrom: "2026-09-15",
          checklistItemIds: current.checklistItemIds.slice(1),
        }),
      )
      .unwrap();
    const error = await failure(
      store
        .dispatch(
          auditRunsApi.endpoints.previewRunChecklist.initiate({
            ...bellfastJuly,
            ...scope,
            activityPeriodStart: "2026-09-01",
            activityPeriodEnd: "2026-09-30",
          }),
        )
        .unwrap(),
    );
    expect(error).toMatchObject({ code: "ASSIGNMENT_CHANGED_IN_PERIOD" });
  });

  it("rejects bad windows with field errors", async () => {
    const store = await auditor();
    const error = await failure(
      store
        .dispatch(
          auditRunsApi.endpoints.createAuditRun.initiate({ ...bellfastJuly, executionWindowStart: "2026-07-20" }),
        )
        .unwrap(),
    );
    expect(error).toMatchObject({ status: 400, fieldErrors: { executionWindowStart: expect.any(String) } });
  });

  it("shows vendor users only their own runs (§18)", async () => {
    const store = makeStore();
    await store
      .dispatch(authApi.endpoints.login.initiate({ email: "vendor@rathna.test", password: "Password@123" }))
      .unwrap();
    const page = await store.dispatch(auditRunsApi.endpoints.getAuditRuns.initiate({ size: 50 })).unwrap();
    expect(page.content.every((r) => r.vendorId === "ven-rathna")).toBe(true);
  });
});
