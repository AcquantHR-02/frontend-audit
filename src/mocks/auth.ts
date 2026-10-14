import type { SessionUser, User } from "@/types/domain";
import { db } from "./db";
import { errorResponse } from "./utils";

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Opaque mock token: `mock.<userId>.<expiresAtMs>`. Real backend issues a signed JWT. */
export function issueAccessToken(userId: string) {
  return `mock.${userId}.${Date.now() + ACCESS_TOKEN_TTL_MS}`;
}

export function toSessionUser(user: User): SessionUser {
  const { id, email, fullName, role, vendorId, peId, mustChangePassword } = user;
  return { id, email, fullName, role, vendorId, peId, mustChangePassword };
}

/** Resolves the caller from the Bearer token, or returns a 401 response to send back. */
export function authenticate(request: Request): User | Response {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  const [prefix, userId, expiresAt] = token?.split(".") ?? [];
  if (prefix !== "mock" || !userId || Number(expiresAt) < Date.now()) {
    return errorResponse(401, "Your session has expired. Please sign in again.");
  }
  const user = db.users.find((u) => u.id === userId && u.isActive);
  return user ?? errorResponse(401, "Account not found or inactive.");
}
