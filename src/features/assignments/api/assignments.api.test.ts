import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { assignmentsApi } from "./assignments.api";

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

describe("assignments API", () => {
  it("blocks overlapping vendor-unit assignments", async () => {
    const store = await auditor();
    const clash = await failure(
      store
        .dispatch(
          assignmentsApi.endpoints.assignVendorToUnit.initiate({
            vendorId: "ven-bellfast",
            peUnitId: "unit-hrh",
            effectiveFrom: "2026-10-01",
          }),
        )
        .unwrap(),
    );
    expect(clash).toMatchObject({
      status: 409,
      fieldErrors: { peUnitId: expect.stringContaining("already assigned") },
    });
  });

  it("versions a vendor checklist: new version closes the previous the day before", async () => {
    const store = await auditor();
    const args = { vendorId: "ven-bellfast", peUnitId: "unit-hrh" };
    const [current] = await store.dispatch(assignmentsApi.endpoints.getVendorChecklistVersions.initiate(args)).unwrap();
    expect(current.effectiveTo).toBeNull();

    const tooEarly = await failure(
      store
        .dispatch(
          assignmentsApi.endpoints.saveVendorChecklistVersion.initiate({
            ...args,
            effectiveFrom: current.effectiveFrom,
            checklistItemIds: current.checklistItemIds,
          }),
        )
        .unwrap(),
    );
    expect(tooEarly).toMatchObject({ fieldErrors: { effectiveFrom: expect.any(String) } });

    const notInMaster = await failure(
      store
        .dispatch(
          assignmentsApi.endpoints.saveVendorChecklistVersion.initiate({
            ...args,
            effectiveFrom: "2026-11-01",
            checklistItemIds: ["pci-001"],
          }),
        )
        .unwrap(),
    );
    expect(notInMaster).toMatchObject({ fieldErrors: { checklistItemIds: expect.any(String) } });

    await store
      .dispatch(
        assignmentsApi.endpoints.saveVendorChecklistVersion.initiate({
          ...args,
          effectiveFrom: "2026-11-01",
          checklistItemIds: current.checklistItemIds.slice(1),
        }),
      )
      .unwrap();
    const versions = await store
      .dispatch(assignmentsApi.endpoints.getVendorChecklistVersions.initiate(args, { forceRefetch: true }))
      .unwrap();
    expect(versions).toHaveLength(2);
    expect(versions[0]).toMatchObject({ effectiveFrom: "2026-11-01", effectiveTo: null });
    expect(versions[1].effectiveTo).toBe("2026-10-31");
  });
});
