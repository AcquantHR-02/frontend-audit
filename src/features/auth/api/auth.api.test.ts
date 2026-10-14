import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { vendorsApi } from "@/features/masters";
import { handlers } from "@/mocks/handlers";
import { makeStore, tokenRefreshed } from "@/store";
import { authApi } from "./auth.api";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function signIn(store: ReturnType<typeof makeStore>) {
  return store
    .dispatch(authApi.endpoints.login.initiate({ email: "admin@acquanthr.test", password: "Password@123" }))
    .unwrap();
}

describe("auth + RTK Query pipeline (against MSW handlers)", () => {
  it("logs in, stores the session and loads protected data", async () => {
    const store = makeStore();
    const result = await signIn(store);

    expect(result.user.role).toBe("AUDITOR_ADMIN");
    expect(store.getState().session.status).toBe("authenticated");

    const vendors = await store.dispatch(vendorsApi.endpoints.getVendors.initiate({ size: 5 })).unwrap();
    expect(vendors.totalElements).toBe(19);
    expect(vendors.content).toHaveLength(5);
  });

  it("returns a normalised ApiError for bad credentials", async () => {
    const store = makeStore();
    const error = await store
      .dispatch(authApi.endpoints.login.initiate({ email: "admin@acquanthr.test", password: "wrong" }))
      .unwrap()
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
    expect(store.getState().session.status).toBe("idle");
  });

  it("refreshes an expired access token once and retries the request", async () => {
    const store = makeStore();
    await signIn(store);
    // Simulate expiry: token whose expiresAt is in the past.
    store.dispatch(tokenRefreshed({ accessToken: "mock.usr-admin.0" }));

    const vendors = await store.dispatch(vendorsApi.endpoints.getVendors.initiate({ size: 1 })).unwrap();

    expect(vendors.totalElements).toBe(19);
    expect(store.getState().session.accessToken).not.toBe("mock.usr-admin.0");
  });

  it("locks the account after 5 failed attempts and reports attempts left", async () => {
    const store = makeStore();
    const attempt = () =>
      store
        .dispatch(authApi.endpoints.login.initiate({ email: "pe@veerometals.test", password: "nope" }))
        .unwrap()
        .catch((e: unknown) => e);

    expect(await attempt()).toMatchObject({ status: 401, message: expect.stringContaining("4 attempts left") });
    for (let i = 0; i < 3; i++) await attempt();
    expect(await attempt()).toMatchObject({ status: 423, code: "ACCOUNT_LOCKED" });

    // Even the right password is refused while locked.
    const locked = await store
      .dispatch(authApi.endpoints.login.initiate({ email: "pe@veerometals.test", password: "Password@123" }))
      .unwrap()
      .catch((e: unknown) => e);
    expect(locked).toMatchObject({ code: "ACCOUNT_LOCKED" });
  });

  it("forces and completes a first-login password change", async () => {
    const store = makeStore();
    const { user } = await store
      .dispatch(authApi.endpoints.login.initiate({ email: "newuser@acquanthr.test", password: "Password@123" }))
      .unwrap();
    expect(user.mustChangePassword).toBe(true);

    const wrongCurrent = await store
      .dispatch(authApi.endpoints.changePassword.initiate({ currentPassword: "bad", newPassword: "N3w!Passw0rd" }))
      .unwrap()
      .catch((e: unknown) => e);
    expect(wrongCurrent).toMatchObject({ code: "INVALID_CURRENT_PASSWORD" });

    await store
      .dispatch(
        authApi.endpoints.changePassword.initiate({ currentPassword: "Password@123", newPassword: "N3w!Passw0rd" }),
      )
      .unwrap();
    expect(store.getState().session.user?.mustChangePassword).toBe(false);
  });
});
