import { http, HttpResponse } from "msw";
import { authenticate, issueAccessToken, toSessionUser } from "../auth";
import { db, persist } from "../db";
import { apiUrl, errorResponse, networkDelay } from "../utils";

const MAX_FAILED_LOGINS = 5;

export const authHandlers = [
  http.post(apiUrl("/auth/login"), async ({ request }) => {
    await networkDelay();
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    const user = db.users.find((u) => u.email.toLowerCase() === email?.trim().toLowerCase());

    // Unknown email gets the same message as a wrong password (no account enumeration).
    if (!user) return errorResponse(401, "Email or password is incorrect.", { code: "INVALID_CREDENTIALS" });

    const failed = db.failedLogins[user.id] ?? 0;
    if (failed >= MAX_FAILED_LOGINS) {
      return errorResponse(
        423,
        "This account is locked after too many failed attempts. Ask your Auditor Admin to unlock it.",
        {
          code: "ACCOUNT_LOCKED",
        },
      );
    }
    if (!user.isActive) {
      return errorResponse(403, "This account is inactive. Contact your Auditor Admin.", { code: "ACCOUNT_INACTIVE" });
    }
    if (password !== db.passwords[user.id]) {
      db.failedLogins[user.id] = failed + 1;
      persist();
      const left = MAX_FAILED_LOGINS - failed - 1;
      return left > 0
        ? errorResponse(
            401,
            `Email or password is incorrect. ${left} attempt${left === 1 ? "" : "s"} left before the account is locked.`,
            {
              code: "INVALID_CREDENTIALS",
            },
          )
        : errorResponse(423, "This account is now locked. Ask your Auditor Admin to unlock it.", {
            code: "ACCOUNT_LOCKED",
          });
    }

    db.failedLogins[user.id] = 0;
    db.refreshSession = { userId: user.id };
    persist();
    return HttpResponse.json({ accessToken: issueAccessToken(user.id), user: toSessionUser(user) });
  }),

  http.post(apiUrl("/auth/refresh"), async () => {
    await networkDelay();
    const user = db.users.find((u) => u.id === db.refreshSession?.userId && u.isActive);
    if (!user) return errorResponse(401, "No active session.");
    return HttpResponse.json({ accessToken: issueAccessToken(user.id), user: toSessionUser(user) });
  }),

  http.post(apiUrl("/auth/logout"), async () => {
    db.refreshSession = null;
    persist();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(apiUrl("/auth/me"), async ({ request }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    return HttpResponse.json(toSessionUser(user));
  }),

  http.post(apiUrl("/auth/change-password"), async ({ request }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;

    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (currentPassword !== db.passwords[user.id]) {
      return errorResponse(400, "Current password is incorrect.", {
        code: "INVALID_CURRENT_PASSWORD",
        fieldErrors: { currentPassword: "Current password is incorrect." },
      });
    }
    if (!newPassword || newPassword === currentPassword) {
      return errorResponse(400, "Choose a password you haven't used here before.", {
        fieldErrors: { newPassword: "Must differ from the current password." },
      });
    }

    db.passwords[user.id] = newPassword;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    user.updatedBy = user.id;
    persist();
    return HttpResponse.json(toSessionUser(user));
  }),
];
