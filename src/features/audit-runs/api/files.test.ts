// @vitest-environment node -- API tests: native fetch/FormData (jsdom FormData hangs with Node fetch)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { handlers } from "@/mocks/handlers";
import { fetchFile, makeStore } from "@/store";
import { auditRunsApi } from "./audit-runs.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function signIn(email: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  return store;
}

const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);

describe("evidence files", () => {
  it("serves seeded evidence as a sample document, only to people who can see the run", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const vendor = await signIn("vendor@rathna.test");

    const runs = await auditor
      .dispatch(auditRunsApi.endpoints.getAuditRuns.initiate({ search: "Rathna", phase: "PUBLISHED", size: 1 }))
      .unwrap();
    const items = await auditor.dispatch(auditRunsApi.endpoints.getRunItems.initiate(runs.content[0].id)).unwrap();
    // Complied items always carry uploaded files in the seed (NA proposals may have none).
    const withEvidence = items.find((i) => i.evidenceCount > 0 && i.complianceStatus === "COMPLIED")!;
    const [record] = await auditor.dispatch(auditRunsApi.endpoints.getAirEvidence.initiate(withEvidence.id)).unwrap();
    const file = record.files[0];
    expect(file.url.endsWith(`/files/${file.id}`)).toBe(true);

    const blob = await fetchFile(file.url, auditor);
    expect(blob.type).toBe(file.contentType);
    const head = await blob.slice(0, 8).text();
    expect(head.startsWith(file.contentType === "application/pdf" ? "%PDF-1.4" : "<svg")).toBe(true);

    // The run's own vendor can read it; a different party can't.
    await expect(fetchFile(file.url, vendor)).resolves.toBeInstanceOf(Blob);
    const pe = await signIn("pe@veerometals.test");
    const other = await auditor
      .dispatch(auditRunsApi.endpoints.getAuditRuns.initiate({ search: "Bellfast", phase: "PUBLISHED", size: 1 }))
      .unwrap();
    const otherItems = await auditor
      .dispatch(auditRunsApi.endpoints.getRunItems.initiate(other.content[0].id))
      .unwrap();
    const [otherRecord] = await auditor
      .dispatch(
        auditRunsApi.endpoints.getAirEvidence.initiate(
          otherItems.find((i) => i.evidenceCount > 0 && i.complianceStatus === "COMPLIED")!.id,
        ),
      )
      .unwrap();
    expect(await failure(fetchFile(otherRecord.files[0].url, vendor))).toMatchObject({ status: 404 });
    // PE users see vendor audits at their own units (Bellfast works at a Veero Metals unit).
    await expect(fetchFile(otherRecord.files[0].url, pe)).resolves.toBeInstanceOf(Blob);
  });

  it("returns the exact bytes of an uploaded file", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const runs = await auditor
      .dispatch(auditRunsApi.endpoints.getAuditRuns.initiate({ phase: "REVIEW", size: 1 }))
      .unwrap();
    const items = await auditor.dispatch(auditRunsApi.endpoints.getRunItems.initiate(runs.content[0].id)).unwrap();
    const form = new FormData();
    form.append("files", new File(["hello evidence"], "note.txt", { type: "text/plain" }));
    const record = await auditor
      .dispatch(auditRunsApi.endpoints.uploadEvidence.initiate({ airId: items[0].id, runId: runs.content[0].id, form }))
      .unwrap();
    const blob = await fetchFile(record.files[0].url, auditor);
    expect(await blob.text()).toBe("hello evidence");
    const missing = record.files[0].url.replace(record.files[0].id, "file-missing");
    expect(await failure(fetchFile(missing, auditor))).toMatchObject({ status: 404 });
  });
});
