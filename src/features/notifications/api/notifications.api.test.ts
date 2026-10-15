// @vitest-environment node -- API tests: native fetch/FormData (jsdom FormData hangs with Node fetch)
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { findingsApi } from "@/features/findings";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { notificationsApi } from "./notifications.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function signIn(email: string) {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password: "Password@123" })).unwrap();
  return store;
}

const PARTY_TYPES = ["WINDOW_OPENED", "WINDOW_CLOSING", "RUN_PUBLISHED", "FINDING_RESOLVED", "FINDING_REOPENED"];

describe("notifications (§17, in-app)", () => {
  it("gives a vendor only party notifications about its own runs", async () => {
    const vendor = await signIn("vendor@rathna.test");
    const page = await vendor
      .dispatch(notificationsApi.endpoints.getNotifications.initiate({ size: 100 }, { forceRefetch: true }))
      .unwrap();
    expect(page.content.length).toBeGreaterThan(0);
    expect(page.content.every((n) => PARTY_TYPES.includes(n.type))).toBe(true);
    // Scheduled notifications are created once: a second read doesn't duplicate them.
    const again = await vendor
      .dispatch(notificationsApi.endpoints.getNotifications.initiate({ size: 100 }, { forceRefetch: true }))
      .unwrap();
    expect(again.totalElements).toBe(page.totalElements);
  });

  it("notifies the party when an auditor resolves its finding, and tracks read state", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    const vendor = await signIn("vendor@rathna.test");
    const read = () =>
      vendor
        .dispatch(notificationsApi.endpoints.getNotifications.initiate({ size: 100 }, { forceRefetch: true }))
        .unwrap();

    await vendor.dispatch(notificationsApi.endpoints.markAllNotificationsRead.initiate()).unwrap();
    expect((await read()).unreadCount).toBe(0);

    const open = await auditor
      .dispatch(findingsApi.endpoints.getFindings.initiate({ status: "OPEN", search: "Rathna", page: 0, size: 5 }))
      .unwrap();
    const finding = open.content[0];
    await auditor
      .dispatch(findingsApi.endpoints.updateFinding.initiate({ id: finding.id, status: "RESOLVED" }))
      .unwrap();

    const after = await read();
    expect(after.unreadCount).toBe(1);
    const resolved = after.content.find((n) => n.type === "FINDING_RESOLVED")!;
    expect(resolved.readAt).toBeNull();
    expect(resolved.href).toBe(`/findings/${finding.id}`);

    await vendor.dispatch(notificationsApi.endpoints.markNotificationRead.initiate(resolved.id)).unwrap();
    expect((await read()).unreadCount).toBe(0);
  });
});
