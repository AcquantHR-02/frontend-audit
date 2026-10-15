// @vitest-environment node -- API tests: native fetch (jsdom fetch hangs with MSW in Node)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { findingsApi } from "@/features/findings";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { savedViewsApi } from "./saved-views.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function signIn(email: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  return store;
}

const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);

describe("saved views", () => {
  it("are private to their owner, unique by name and deletable", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const admin = await signIn("admin@acquanthr.test");
    const view = { scope: "findings", name: "Old open", query: "age=60&status=OPEN" };

    const saved = await auditor.dispatch(savedViewsApi.endpoints.createSavedView.initiate(view)).unwrap();
    expect(
      await failure(auditor.dispatch(savedViewsApi.endpoints.createSavedView.initiate(view)).unwrap()),
    ).toMatchObject({ status: 400 });
    const mine = await auditor.dispatch(savedViewsApi.endpoints.getSavedViews.initiate("findings")).unwrap();
    expect(mine.map((v) => v.name)).toEqual(["Old open"]);
    const theirs = await admin.dispatch(savedViewsApi.endpoints.getSavedViews.initiate("findings")).unwrap();
    expect(theirs).toEqual([]);

    await auditor
      .dispatch(savedViewsApi.endpoints.deleteSavedView.initiate({ id: saved.id, scope: "findings" }))
      .unwrap();
    const after = await auditor
      .dispatch(savedViewsApi.endpoints.getSavedViews.initiate("findings", { forceRefetch: true }))
      .unwrap();
    expect(after).toEqual([]);
  });

  it("filters findings by age", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const all = await auditor.dispatch(findingsApi.endpoints.getFindings.initiate({ size: 200 })).unwrap();
    const old = await auditor
      .dispatch(findingsApi.endpoints.getFindings.initiate({ size: 200, minAgeDays: 60 }))
      .unwrap();
    const cutoff = Date.now() - 60 * 86_400_000;
    expect(old.content.every((f) => Date.parse(f.createdAt) <= cutoff)).toBe(true);
    expect(old.totalElements).toBe(all.content.filter((f) => Date.parse(f.createdAt) <= cutoff).length);
  });
});
