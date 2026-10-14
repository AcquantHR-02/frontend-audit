import { http, HttpResponse } from "msw";
import { Permission } from "@/lib/auth";
import type { Role, User, UserView } from "@/types/domain";
import { crudHandlers, isTaken, requireUser, stampCreated } from "../crud";
import { logEvent } from "../audit-log";
import { db, persist } from "../db";
import { apiUrl, boolParam, errorResponse, networkDelay, newId, nowIso } from "../utils";

const ROLES: Role[] = ["AUDITOR_ADMIN", "AUDITOR_USER", "VENDOR_USER", "PE_USER"];
const LOCK_THRESHOLD = 5;

type UserInput = Pick<User, "fullName" | "email" | "role" | "vendorId" | "peId">;

const isLocked = (user: User) => (db.failedLogins[user.id] ?? 0) >= LOCK_THRESHOLD;

function toUserView(user: User): UserView {
  const scopeName =
    user.role === "VENDOR_USER"
      ? (db.vendors.find((v) => v.id === user.vendorId)?.name ?? null)
      : user.role === "PE_USER"
        ? (db.principalEmployers.find((p) => p.id === user.peId)?.name ?? null)
        : null;
  return { ...user, isLocked: isLocked(user), scopeName };
}

/** 12-char temporary password that satisfies the password policy. */
function temporaryPassword() {
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const base = Array.from({ length: 8 }, () => pick("abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789")).join(
    "",
  );
  return `${base}${pick("ABCDEFGHJKLMNPQRSTUVWXYZ")}${pick("23456789")}${pick("!@#$%&*")}${pick("abcdefghjkmnpqrstuvwxyz")}`;
}

function validateUser(input: UserInput, existing: User | null) {
  const errors: Record<string, string> = {};
  if (!input.fullName?.trim()) errors.fullName = "Enter the person's full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email ?? "")) errors.email = "Enter a valid email address";
  else if (isTaken(db.users, existing, (u) => u.email, input.email))
    errors.email = "An account with this email already exists";
  if (!ROLES.includes(input.role)) errors.role = "Select a role";
  if (input.role === "VENDOR_USER" && !db.vendors.some((v) => v.id === input.vendorId))
    errors.vendorId = "Select the vendor this user belongs to";
  if (input.role === "PE_USER" && !db.principalEmployers.some((p) => p.id === input.peId))
    errors.peId = "Select the Principal Employer this user belongs to";
  return Object.keys(errors).length ? errors : null;
}

const scopeFields = (input: UserInput) => ({
  vendorId: input.role === "VENDOR_USER" ? input.vendorId : null,
  peId: input.role === "PE_USER" ? input.peId : null,
});

const userCrud = crudHandlers<User, UserInput, UserView>({
  path: "/users",
  collection: () => db.users,
  readPermission: Permission.USERS_MANAGE,
  writePermission: Permission.USERS_MANAGE,
  searchFields: ["fullName", "email", "scopeName"],
  defaultSort: "fullName,asc",
  filter: (user, url) => {
    const role = url.searchParams.get("role");
    const active = boolParam(url, "active");
    return (!role || user.role === role) && (active === null || user.isActive === active);
  },
  toView: toUserView,
  validate: validateUser,
  create: () => {
    throw new Error("POST /users is handled by createUser");
  },
  update: (item, input) =>
    Object.assign(item, {
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      ...scopeFields(input),
    }),
});

/** Admin actions that act on one account. Registered before the generic `/users` routes. */
const userActions = [
  /** Create returns the initial temporary password once (real backend would email it instead). */
  http.post(apiUrl("/users"), async ({ request }) => {
    await networkDelay();
    const actor = requireUser(request, Permission.USERS_MANAGE);
    if (actor instanceof Response) return actor;
    const input = (await request.json()) as UserInput;
    const errors = validateUser(input, null);
    if (errors) {
      const conflict = !!errors.email?.includes("already");
      return errorResponse(conflict ? 409 : 400, Object.values(errors)[0], {
        code: conflict ? "DUPLICATE" : "VALIDATION_FAILED",
        fieldErrors: errors,
      });
    }
    const user: User = {
      id: newId("usr"),
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      ...scopeFields(input),
      isActive: true,
      mustChangePassword: true,
      isLocked: false,
      ...stampCreated(actor),
    };
    const password = temporaryPassword();
    db.users.push(user);
    db.passwords[user.id] = password;
    logEvent(actor, "USER_CREATED", "User", user.id, `Created ${user.email} (${user.role})`);
    persist();
    return HttpResponse.json({ user: toUserView(user), temporaryPassword: password }, { status: 201 });
  }),
  http.patch(apiUrl("/users/:id/status"), async ({ request, params }) => {
    await networkDelay();
    const actor = requireUser(request, Permission.USERS_MANAGE);
    if (actor instanceof Response) return actor;
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return errorResponse(404, "User not found.");
    const { isActive } = (await request.json()) as { isActive: boolean };
    if (!isActive && user.id === actor.id) {
      return errorResponse(409, "You can't deactivate your own account.", { code: "SELF_DEACTIVATION" });
    }
    user.isActive = isActive;
    user.updatedAt = nowIso();
    user.updatedBy = actor.id;
    if (!isActive && db.refreshSession?.userId === user.id) db.refreshSession = null;
    persist();
    return HttpResponse.json(toUserView(user));
  }),

  http.post(apiUrl("/users/:id/reset-password"), async ({ request, params }) => {
    await networkDelay();
    const actor = requireUser(request, Permission.USERS_MANAGE);
    if (actor instanceof Response) return actor;
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return errorResponse(404, "User not found.");
    const password = temporaryPassword();
    db.passwords[user.id] = password;
    db.failedLogins[user.id] = 0;
    user.mustChangePassword = true;
    user.updatedAt = nowIso();
    user.updatedBy = actor.id;
    logEvent(actor, "PASSWORD_RESET", "User", user.id, `Password reset for ${user.email}`);
    persist();
    // Real backend: emails the user instead of returning the password.
    return HttpResponse.json({ temporaryPassword: password, user: toUserView(user) });
  }),

  http.post(apiUrl("/users/:id/unlock"), async ({ request, params }) => {
    await networkDelay();
    const actor = requireUser(request, Permission.USERS_MANAGE);
    if (actor instanceof Response) return actor;
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return errorResponse(404, "User not found.");
    db.failedLogins[user.id] = 0;
    user.updatedAt = nowIso();
    user.updatedBy = actor.id;
    persist();
    return HttpResponse.json(toUserView(user));
  }),
];

export const usersHandlers = [...userActions, ...userCrud];
