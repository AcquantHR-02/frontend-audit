import { http, HttpResponse } from "msw";
import { authenticate, issueAccessToken, toSessionUser } from "../auth";
import { db, MOCK_PASSWORD, persist } from "../db";
import { apiUrl, errorResponse, networkDelay } from "../utils";

export const authHandlers = [
  http.post(apiUrl("/auth/login"), async ({ request }) => {
    await networkDelay();
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    const user = db.users.find((u) => u.email.toLowerCase() === email?.trim().toLowerCase());

    if (!user || password !== MOCK_PASSWORD) {
      return errorResponse(401, "Email or password is incorrect.", { code: "INVALID_CREDENTIALS" });
    }
    if (!user.isActive) {
      return errorResponse(403, "This account is inactive. Contact your Auditor Admin.", { code: "ACCOUNT_INACTIVE" });
    }

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
];
