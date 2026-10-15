// @vitest-environment node -- API tests: native fetch (jsdom fetch hangs with MSW in Node)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { findingsApi } from "@/features/findings";
import { notificationsApi } from "@/features/notifications";
import { handlers } from "@/mocks/handlers";
import { makeStore, selectCurrentUser } from "@/store";
import { settingsApi } from "./settings.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function signIn(email: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  return store;
}

const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);

describe("settings", () => {
  it("updates the display name and the session with it", async () => {
    const vendor = await signIn("vendor@rathna.test");
    await vendor.dispatch(settingsApi.endpoints.updateProfile.initiate({ fullName: "  Suresh   K  " })).unwrap();
    expect(selectCurrentUser(vendor.getState())?.fullName).toBe("Suresh K");
    expect(
      await failure(vendor.dispatch(settingsApi.endpoints.updateProfile.initiate({ fullName: "x" })).unwrap()),
    ).toMatchObject({ status: 400 });
  });

  it("doesn't deliver notification types the user switched off", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const vendor = await signIn("vendor@rathna.test");
    await vendor
      .dispatch(settingsApi.endpoints.updatePreferences.initiate({ mutedNotifications: ["FINDING_RESOLVED"] }))
      .unwrap();
    await vendor.dispatch(notificationsApi.endpoints.markAllNotificationsRead.initiate()).unwrap();

    const open = await auditor
      .dispatch(findingsApi.endpoints.getFindings.initiate({ status: "OPEN", search: "Rathna", size: 1 }))
      .unwrap();
    await auditor
      .dispatch(findingsApi.endpoints.updateFinding.initiate({ id: open.content[0].id, status: "RESOLVED" }))
      .unwrap();

    const page = await vendor
      .dispatch(notificationsApi.endpoints.getNotifications.initiate({ size: 100 }, { forceRefetch: true }))
      .unwrap();
    expect(page.unreadCount).toBe(0);
    expect(page.content.some((n) => n.type === "FINDING_RESOLVED" && !n.readAt)).toBe(false);
    const prefs = await vendor.dispatch(settingsApi.endpoints.getPreferences.initiate()).unwrap();
    expect(prefs.mutedNotifications).toEqual(["FINDING_RESOLVED"]);
  });
});
