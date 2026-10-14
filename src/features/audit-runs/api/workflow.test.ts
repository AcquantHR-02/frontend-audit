// @vitest-environment node -- API tests: native fetch/FormData (jsdom FormData hangs with Node fetch)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { findingsApi } from "@/features/findings";
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

function evidenceForm(files: number, remarks: string, na = false) {
  const form = new FormData();
  for (let i = 0; i < files; i++) form.append("files", new File(["%PDF"], `doc-${i}.pdf`, { type: "application/pdf" }));
  form.append("partyRemarks", remarks);
  form.append("naProposedByParty", String(na));
  return form;
}

describe("audit workflow: Window 1 → review → Window 2 → publish (§4, §6, §14)", () => {
  it("runs end to end with the spec's rules enforced", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const vendor = await signIn("vendor@rathna.test");

    // Activity period = the 30 days before today; Window 1 opens today.
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
    expect(run.phase).toBe("WINDOW_1");
    const airs = await auditor.dispatch(auditRunsApi.endpoints.getRunItems.initiate(run.id)).unwrap();
    const [first, second] = airs;

    // Party: 0 files without NA → rejected; NA proposal with remarks → accepted.
    expect(
      await failure(
        vendor
          .dispatch(
            auditRunsApi.endpoints.uploadEvidence.initiate({
              airId: first.id,
              runId: run.id,
              form: evidenceForm(0, "x"),
            }),
          )
          .unwrap(),
      ),
    ).toMatchObject({ status: 400 });
    await vendor
      .dispatch(
        auditRunsApi.endpoints.uploadEvidence.initiate({
          airId: first.id,
          runId: run.id,
          form: evidenceForm(2, "Registration certificate"),
        }),
      )
      .unwrap();
    await vendor
      .dispatch(
        auditRunsApi.endpoints.uploadEvidence.initiate({
          airId: second.id,
          runId: run.id,
          form: evidenceForm(0, "Not applicable to us", true),
        }),
      )
      .unwrap();

    // Stamping is only allowed in review.
    expect(
      await failure(
        auditor
          .dispatch(
            auditRunsApi.endpoints.reviewAir.initiate({
              airId: first.id,
              runId: run.id,
              complianceStatus: "COMPLIED",
              auditRemarks: "ok",
            }),
          )
          .unwrap(),
      ),
    ).toMatchObject({ code: "NOT_IN_REVIEW" });

    await auditor.dispatch(auditRunsApi.endpoints.startReview.initiate(run.id)).unwrap();
    // Party locked out during review.
    expect(
      await failure(
        vendor
          .dispatch(
            auditRunsApi.endpoints.uploadEvidence.initiate({
              airId: first.id,
              runId: run.id,
              form: evidenceForm(1, "late"),
            }),
          )
          .unwrap(),
      ),
    ).toMatchObject({ status: 403 });

    // Remarks are mandatory; validTo mandatory for ONE_TIME items with evidence.
    expect(
      await failure(
        auditor
          .dispatch(
            auditRunsApi.endpoints.reviewAir.initiate({
              airId: first.id,
              runId: run.id,
              complianceStatus: "COMPLIED",
              auditRemarks: " ",
            }),
          )
          .unwrap(),
      ),
    ).toMatchObject({ fieldErrors: { auditRemarks: expect.any(String) } });

    const stamp = (airId: string, status: "COMPLIED" | "NOT_COMPLIED" | "NOT_APPLICABLE", cadence: string) =>
      auditor
        .dispatch(
          auditRunsApi.endpoints.reviewAir.initiate({
            airId,
            runId: run.id,
            complianceStatus: status,
            auditRemarks: "Verified",
            validTo: cadence === "ONE_TIME" ? addDays(today, 365) : null,
          }),
        )
        .unwrap();
    await stamp(first.id, "NOT_COMPLIED", first.cadenceSnapshot);
    for (const air of airs.slice(1))
      await stamp(air.id, air === second ? "NOT_APPLICABLE" : "COMPLIED", air.cadenceSnapshot);

    // One NC → Window 2 is required.
    expect(
      await failure(auditor.dispatch(auditRunsApi.endpoints.endReview.initiate({ runId: run.id })).unwrap()),
    ).toMatchObject({
      code: "WINDOW2_REQUIRED",
    });
    const inW2 = await auditor
      .dispatch(
        auditRunsApi.endpoints.endReview.initiate({
          runId: run.id,
          window2Start: today,
          window2End: addDays(today, 3),
        }),
      )
      .unwrap();
    expect(inW2.phase).toBe("WINDOW_2");

    // Window 2: party may upload for the NC item only.
    await vendor
      .dispatch(
        auditRunsApi.endpoints.uploadEvidence.initiate({
          airId: first.id,
          runId: run.id,
          form: evidenceForm(1, "Corrected"),
        }),
      )
      .unwrap();
    expect(
      await failure(
        vendor
          .dispatch(
            auditRunsApi.endpoints.uploadEvidence.initiate({
              airId: airs[2].id,
              runId: run.id,
              form: evidenceForm(1, "x"),
            }),
          )
          .unwrap(),
      ),
    ).toMatchObject({ status: 403 });

    // Publish only from Final Review; it opens one finding for the remaining NC.
    expect(await failure(auditor.dispatch(auditRunsApi.endpoints.publishRun.initiate(run.id)).unwrap())).toMatchObject({
      code: "NOT_IN_FINAL_REVIEW",
    });
    await auditor.dispatch(auditRunsApi.endpoints.closeWindow2.initiate(run.id)).unwrap();
    const check = await auditor.dispatch(auditRunsApi.endpoints.getPublishCheck.initiate(run.id)).unwrap();
    expect(check).toMatchObject({ canPublish: true, findingsToOpen: 1 });
    const published = await auditor.dispatch(auditRunsApi.endpoints.publishRun.initiate(run.id)).unwrap();
    expect(published.phase).toBe("PUBLISHED");
    expect(published.score).toMatchObject({ notComplied: 1, notApplicable: 1, pending: 0 });

    // Party frozen after publish.
    expect(
      await failure(
        vendor
          .dispatch(
            auditRunsApi.endpoints.uploadEvidence.initiate({
              airId: first.id,
              runId: run.id,
              form: evidenceForm(1, "after"),
            }),
          )
          .unwrap(),
      ),
    ).toMatchObject({ status: 403 });

    // §14 — finding lifecycle: party remediates while OPEN, auditor resolves, party locked out.
    const findings = await vendor.dispatch(findingsApi.endpoints.getFindings.initiate({ runId: run.id })).unwrap();
    expect(findings.totalElements).toBe(1);
    const findingId = findings.content[0].id;
    const remediation = new FormData();
    remediation.append("files", new File(["%PDF"], "challan.pdf", { type: "application/pdf" }));
    remediation.append("remarks", "Paid and filed");
    await vendor.dispatch(findingsApi.endpoints.addRemediation.initiate({ id: findingId, form: remediation })).unwrap();
    await auditor
      .dispatch(findingsApi.endpoints.updateFinding.initiate({ id: findingId, status: "RESOLVED" }))
      .unwrap();
    const again = new FormData();
    again.append("files", new File(["%PDF"], "more.pdf", { type: "application/pdf" }));
    again.append("remarks", "more");
    expect(
      await failure(
        vendor.dispatch(findingsApi.endpoints.addRemediation.initiate({ id: findingId, form: again })).unwrap(),
      ),
    ).toMatchObject({ code: "FINDING_RESOLVED" });
  });
});
