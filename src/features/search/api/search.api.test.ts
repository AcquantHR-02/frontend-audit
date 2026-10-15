// @vitest-environment node -- API tests: native fetch (jsdom fetch hangs with MSW in Node)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { searchApi } from "./search.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function search(email: string, q: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  return store.dispatch(searchApi.endpoints.globalSearch.initiate(q)).unwrap();
}

describe("global search", () => {
  it("finds runs, findings and vendors for an auditor", async () => {
    const { groups } = await search("admin@acquanthr.test", "bellfast");
    expect(groups.map((g) => g.type)).toEqual(expect.arrayContaining(["runs", "vendors"]));
    expect(groups.find((g) => g.type === "vendors")?.items[0].href).toBe("/reports/vendors/ven-bellfast");
  });

  it("only returns what a vendor may see", async () => {
    const { groups } = await search("vendor@rathna.test", "bellfast");
    expect(groups).toEqual([]);
    const own = await search("vendor@rathna.test", "rathna");
    expect(own.groups.flatMap((g) => g.items).length).toBeGreaterThan(0);
    expect(own.groups.some((g) => g.type === "users")).toBe(false);
  });

  it("ignores one-letter queries", async () => {
    expect((await search("admin@acquanthr.test", "a")).groups).toEqual([]);
  });
});
