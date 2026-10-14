// @vitest-environment node -- API tests: native fetch/FormData (jsdom FormData hangs with Node fetch)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { actsApi } from "./acts.api";
import { checklistItemsApi } from "./checklist-items.api";
import { principalEmployersApi } from "./principal-employers.api";
import { vendorsApi } from "./vendors.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function signedInStore(email: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  return store;
}

const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);

describe("master data API (against MSW handlers)", () => {
  it("filters, searches and sorts server-side", async () => {
    const store = await signedInStore("auditor@acquanthr.test");
    const page = await store
      .dispatch(vendorsApi.endpoints.getVendors.initiate({ search: "ra", sort: "name,desc", size: 50 }))
      .unwrap();
    const names = page.content.map((v) => v.name);
    expect(names.every((n) => n.toLowerCase().includes("ra"))).toBe(true);
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)));

    const rathna = page.content.find((v) => v.name === "Rathna");
    expect(rathna?.activeUnitCount).toBe(10); // spec §3: Rathna works at 10 units
  });

  it("lets AUDITOR_USER read masters but not change them (§18)", async () => {
    const store = await signedInStore("auditor@acquanthr.test");
    const error = await failure(
      store.dispatch(vendorsApi.endpoints.createVendor.initiate({ name: "Nope Ltd" })).unwrap(),
    );
    expect(error).toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("rejects duplicates with field-level errors (409)", async () => {
    const store = await signedInStore("admin@acquanthr.test");
    const error = await failure(
      store.dispatch(vendorsApi.endpoints.createVendor.initiate({ name: " rathna " })).unwrap(),
    );
    expect(error).toMatchObject({ status: 409, fieldErrors: { name: expect.stringContaining("already exists") } });

    const actError = await failure(
      store
        .dispatch(actsApi.endpoints.createAct.initiate({ name: "Something new", shortName: "CLRA", category: null }))
        .unwrap(),
    );
    expect(actError).toMatchObject({ status: 409, fieldErrors: { shortName: expect.any(String) } });
  });

  it("soft-deletes instead of deleting (§7A Lock 5)", async () => {
    const store = await signedInStore("admin@acquanthr.test");
    const vendor = await store.dispatch(vendorsApi.endpoints.createVendor.initiate({ name: "Temp Vendor" })).unwrap();
    const off = await store
      .dispatch(vendorsApi.endpoints.setVendorStatus.initiate({ id: vendor.id, isActive: false }))
      .unwrap();
    expect(off.isActive).toBe(false);

    const inactive = await store
      .dispatch(vendorsApi.endpoints.getVendors.initiate({ active: false, size: 50 }))
      .unwrap();
    expect(inactive.content.map((v) => v.id)).toContain(vendor.id);
  });

  it("closes a unit one-way: assignments end, reopening does not restore them (§13)", async () => {
    const store = await signedInStore("auditor@acquanthr.test"); // closure = "auditor only", either role
    const units = await store
      .dispatch(principalEmployersApi.endpoints.getUnits.initiate({ peId: "pe-veero", size: 50 }))
      .unwrap();
    const jigani = units.content.find((u) => u.code === "VOM-JIG")!;
    expect(jigani.activeVendorCount).toBeGreaterThan(0);

    const future = await failure(
      store
        .dispatch(principalEmployersApi.endpoints.closeUnit.initiate({ id: jigani.id, closedOn: "2999-01-01" }))
        .unwrap(),
    );
    expect(future).toMatchObject({ status: 400 });

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const closed = await store
      .dispatch(principalEmployersApi.endpoints.closeUnit.initiate({ id: jigani.id, closedOn: yesterday }))
      .unwrap();
    expect(closed.endedAssignments).toBe(jigani.activeVendorCount);
    expect(closed.unit.activeVendorCount).toBe(0);

    const reopened = await store.dispatch(principalEmployersApi.endpoints.reopenUnit.initiate(jigani.id)).unwrap();
    expect(reopened.closedAt).toBeNull();
    expect(reopened.activeVendorCount).toBe(0); // not resurrected
  });

  it("validates checklist items and treats null state as NATIONAL", async () => {
    const store = await signedInStore("admin@acquanthr.test");
    const bad = await failure(
      store
        .dispatch(
          checklistItemsApi.endpoints.createChecklistItem.initiate({
            kind: "pe",
            body: { actId: "act-epf", stateId: null, cadence: "PERIODIC", description: "short" },
          }),
        )
        .unwrap(),
    );
    expect(bad).toMatchObject({ status: 400, fieldErrors: { description: expect.any(String) } });

    const national = await store
      .dispatch(
        checklistItemsApi.endpoints.getChecklistItems.initiate({
          kind: "vendor",
          params: { stateId: "NATIONAL", size: 200 },
        }),
      )
      .unwrap();
    expect(national.totalElements).toBeGreaterThan(0);
    expect(national.content.every((i) => i.stateId === null && i.stateCode === null)).toBe(true);
  });
});
