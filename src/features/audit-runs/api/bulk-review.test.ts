// @vitest-environment node -- API tests: native fetch/FormData (jsdom FormData hangs with Node fetch)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { addDays } from "@/lib/domain";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { auditRunsApi } from "./audit-runs.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);
const today = new Date().toISOString().slice(0, 10);

async function signIn(email: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  return store;
}

describe("bulk stamping", () => {
  it("stamps many items at once and skips one-time items that need a valid-to date", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const vendor = await signIn("vendor@rathna.test");
    const run = await auditor
      .dispatch(
        auditRunsApi.endpoints.createAuditRun.initiate({
          auditType: "VENDOR",
          vendorId: "ven-rathna",
          peUnitId: "unit-jig",
          activityPeriodStart: addDays(today, -31),
          activityPeriodEnd: addDays(today, -1),
          executionWindowStart: today,
          executionWindowEnd: addDays(today, 30),
          window1Start: today,
          window1End: addDays(today, 10),
          periodicItems: [],
        }),
      )
      .unwrap();
    const airs = await auditor.dispatch(auditRunsApi.endpoints.getRunItems.initiate(run.id)).unwrap();
    const oneTime = airs.find((a) => a.cadenceSnapshot === "ONE_TIME")!;
    const others = airs.filter((a) => a.id !== oneTime.id).slice(0, 4);

    const form = new FormData();
    form.append("files", new File(["%PDF"], "licence.pdf", { type: "application/pdf" }));
    form.append("partyRemarks", "Licence copy");
    form.append("naProposedByParty", "false");
    await vendor
      .dispatch(auditRunsApi.endpoints.uploadEvidence.initiate({ airId: oneTime.id, runId: run.id, form }))
      .unwrap();

    const request = {
      runId: run.id,
      airIds: [oneTime.id, ...others.map((a) => a.id)],
      complianceStatus: "COMPLIED" as const,
      auditRemarks: "Verified against originals at the site visit.",
    };
    // Only during review.
    expect(await failure(auditor.dispatch(auditRunsApi.endpoints.bulkReview.initiate(request)).unwrap())).toMatchObject(
      { code: "NOT_IN_REVIEW" },
    );
    await auditor.dispatch(auditRunsApi.endpoints.startReview.initiate(run.id)).unwrap();

    // Remarks are mandatory, same as a single stamp.
    expect(
      await failure(
        auditor.dispatch(auditRunsApi.endpoints.bulkReview.initiate({ ...request, auditRemarks: " " })).unwrap(),
      ),
    ).toMatchObject({ status: 400 });
    // Parties can't stamp.
    expect(await failure(vendor.dispatch(auditRunsApi.endpoints.bulkReview.initiate(request)).unwrap())).toMatchObject({
      status: 403,
    });

    const result = await auditor.dispatch(auditRunsApi.endpoints.bulkReview.initiate(request)).unwrap();
    expect(result.stamped).toEqual(others.map((a) => a.id));
    expect(result.skipped).toEqual([{ airId: oneTime.id, reason: expect.stringContaining("valid-to") }]);

    const after = await auditor
      .dispatch(auditRunsApi.endpoints.getRunItems.initiate(run.id, { forceRefetch: true }))
      .unwrap();
    for (const air of others) {
      expect(after.find((a) => a.id === air.id)).toMatchObject({
        complianceStatus: "COMPLIED",
        submissionStatus: "REVIEWED",
        auditRemarks: request.auditRemarks,
      });
    }
    expect(after.find((a) => a.id === oneTime.id)?.complianceStatus).toBeNull();

    const view = await auditor
      .dispatch(auditRunsApi.endpoints.getAuditRun.initiate(run.id, { forceRefetch: true }))
      .unwrap();
    expect(view.score.complied).toBe(others.length);
  });
});
