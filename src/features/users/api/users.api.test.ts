import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authApi } from "@/features/auth";
import { handlers } from "@/mocks/handlers";
import { makeStore } from "@/store";
import { usersApi } from "./users.api";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

async function signIn(email: string, password = "Password@123") {
  const store = makeStore();
  await store.dispatch(authApi.endpoints.login.initiate({ email, password })).unwrap();
  return store;
}

const failure = (p: Promise<unknown>) => p.then(() => null).catch((e: unknown) => e);

describe("users API (§18)", () => {
  it("creates a scoped party user who must change the temporary password", async () => {
    const admin = await signIn("admin@acquanthr.test");
    const missingScope = await failure(
      admin
        .dispatch(
          usersApi.endpoints.createUser.initiate({
            fullName: "Ravi",
            email: "ravi@bellfast.test",
            role: "VENDOR_USER",
            vendorId: null,
            peId: null,
          }),
        )
        .unwrap(),
    );
    expect(missingScope).toMatchObject({ fieldErrors: { vendorId: expect.any(String) } });

    const { user, temporaryPassword } = await admin
      .dispatch(
        usersApi.endpoints.createUser.initiate({
          fullName: "Ravi Teja",
          email: "Ravi@Bellfast.test",
          role: "VENDOR_USER",
          vendorId: "ven-bellfast",
          peId: "pe-veero", // ignored for vendor users
        }),
      )
      .unwrap();
    expect(user).toMatchObject({
      email: "ravi@bellfast.test",
      vendorId: "ven-bellfast",
      peId: null,
      scopeName: "Bellfast",
    });
    expect(user.mustChangePassword).toBe(true);

    const newUser = await signIn("ravi@bellfast.test", temporaryPassword);
    expect(newUser.getState().session.user?.mustChangePassword).toBe(true);
  });

  it("forbids non-admins and self-deactivation", async () => {
    const auditor = await signIn("auditor@acquanthr.test");
    expect(await failure(auditor.dispatch(usersApi.endpoints.getUsers.initiate()).unwrap())).toMatchObject({
      status: 403,
    });

    const admin = await signIn("admin@acquanthr.test");
    const self = await failure(
      admin.dispatch(usersApi.endpoints.setUserStatus.initiate({ id: "usr-admin", isActive: false })).unwrap(),
    );
    expect(self).toMatchObject({ status: 409, code: "SELF_DEACTIVATION" });
  });

  it("resets a password, which also unlocks the account", async () => {
    const admin = await signIn("admin@acquanthr.test");
    const { temporaryPassword, user } = await admin
      .dispatch(usersApi.endpoints.resetUserPassword.initiate("usr-pe"))
      .unwrap();
    expect(user.isLocked).toBe(false);
    expect(user.mustChangePassword).toBe(true);

    const old = await failure(signIn("pe@veerometals.test"));
    expect(old).toMatchObject({ status: 401 });
    await expect(signIn("pe@veerometals.test", temporaryPassword)).resolves.toBeDefined();
  });
});
