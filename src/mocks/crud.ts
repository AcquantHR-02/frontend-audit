import { http, HttpResponse, type HttpHandler, type JsonBodyType } from "msw";
import { can, type Permission } from "@/lib/auth";
import type { User } from "@/types/domain";
import { authenticate } from "./auth";
import { logEvent } from "./audit-log";
import { persist } from "./db";
import { apiUrl, errorResponse, networkDelay, nowIso, paginate } from "./utils";

type FieldErrors = Record<string, string>;

interface CrudConfig<T extends { id: string }, Input, View = T> {
  /** e.g. "/acts" */
  path: string;
  collection: () => T[];
  readPermission: Permission;
  writePermission: Permission;
  searchFields: (keyof View)[];
  defaultSort?: string;
  /** Extra list filters from query params. */
  filter?: (item: T, url: URL) => boolean;
  /** Enrich each row for the response (counts, labels…). */
  toView?: (item: T) => View;
  /** Return field errors (→ 400/409) or null. `existing` is set on update. */
  validate: (input: Input, existing: T | null) => FieldErrors | null;
  create: (input: Input, user: User) => T;
  update: (item: T, input: Input) => void;
  /** Supports PATCH {path}/:id/status { isActive } for soft-delete entities. */
  softDelete?: boolean;
}

/** Shared write metadata. */
export function stampCreated(user: User) {
  const now = nowIso();
  return { createdAt: now, createdBy: user.id, updatedAt: now, updatedBy: user.id };
}

function requireUser(request: Request, permission: Permission): User | Response {
  const user = authenticate(request);
  if (user instanceof Response) return user;
  if (!can(user, permission)) return errorResponse(403, "You don't have permission to do this.", { code: "FORBIDDEN" });
  return user;
}

function validationError(fieldErrors: FieldErrors) {
  const conflict = Object.values(fieldErrors).some((m) => m.toLowerCase().includes("already"));
  return errorResponse(conflict ? 409 : 400, Object.values(fieldErrors)[0], {
    code: conflict ? "DUPLICATE" : "VALIDATION_FAILED",
    fieldErrors,
  });
}

/**
 * Generates list / get / create / update (/ status) handlers for a master-data collection,
 * mimicking a typical Spring REST controller. Keeps every entity's mock to its rules only.
 */
export function crudHandlers<T extends { id: string; updatedAt: string; updatedBy: string }, Input, View = T>(
  config: CrudConfig<T, Input, View>,
): HttpHandler[] {
  const toView = (item: T): View => (config.toView ? config.toView(item) : (item as unknown as View));
  const view = (item: T) => toView(item) as JsonBodyType;
  const find = (id: unknown) => config.collection().find((item) => item.id === id);
  const notFound = () => errorResponse(404, "Record not found.", { code: "NOT_FOUND" });

  const handlers: HttpHandler[] = [
    http.get(apiUrl(config.path), async ({ request }) => {
      await networkDelay();
      const user = requireUser(request, config.readPermission);
      if (user instanceof Response) return user;
      const url = new URL(request.url);
      const rows = config
        .collection()
        .filter((item) => !config.filter || config.filter(item, url))
        .map(toView);
      return HttpResponse.json(paginate(rows, url, config.searchFields, config.defaultSort) as JsonBodyType);
    }),

    http.get(apiUrl(`${config.path}/:id`), async ({ request, params }) => {
      await networkDelay();
      const user = requireUser(request, config.readPermission);
      if (user instanceof Response) return user;
      const item = find(params.id);
      return item ? HttpResponse.json(view(item)) : notFound();
    }),

    http.post(apiUrl(config.path), async ({ request }) => {
      await networkDelay();
      const user = requireUser(request, config.writePermission);
      if (user instanceof Response) return user;
      const input = (await request.json()) as Input;
      const errors = config.validate(input, null);
      if (errors) return validationError(errors);
      const item = config.create(input, user);
      config.collection().push(item);
      logEvent(user, "CREATED", config.path, item.id, `Created ${config.path.slice(1)} record`);
      persist();
      return HttpResponse.json(view(item), { status: 201 });
    }),

    http.put(apiUrl(`${config.path}/:id`), async ({ request, params }) => {
      await networkDelay();
      const user = requireUser(request, config.writePermission);
      if (user instanceof Response) return user;
      const item = find(params.id);
      if (!item) return notFound();
      const input = (await request.json()) as Input;
      const errors = config.validate(input, item);
      if (errors) return validationError(errors);
      config.update(item, input);
      item.updatedAt = nowIso();
      item.updatedBy = user.id;
      logEvent(user, "UPDATED", config.path, item.id, `Updated ${config.path.slice(1)} record`);
      persist();
      return HttpResponse.json(view(item));
    }),
  ];

  if (config.softDelete) {
    handlers.push(
      http.patch(apiUrl(`${config.path}/:id/status`), async ({ request, params }) => {
        await networkDelay();
        const user = requireUser(request, config.writePermission);
        if (user instanceof Response) return user;
        const item = find(params.id) as (T & { isActive: boolean }) | undefined;
        if (!item) return notFound();
        const { isActive } = (await request.json()) as { isActive: boolean };
        item.isActive = isActive;
        item.updatedAt = nowIso();
        item.updatedBy = user.id;
        logEvent(
          user,
          isActive ? "REACTIVATED" : "DEACTIVATED",
          config.path,
          item.id,
          `${isActive ? "Reactivated" : "Deactivated"} ${config.path.slice(1)} record`,
        );
        persist();
        return HttpResponse.json(view(item));
      }),
    );
  }

  return handlers;
}

export { requireUser };

/** Case-insensitive uniqueness check helper for validators. */
export function isTaken<T extends { id: string }>(
  items: T[],
  existing: T | null,
  pick: (item: T) => string,
  value: string | undefined,
) {
  const needle = value?.trim().toLowerCase();
  return !!needle && items.some((item) => item.id !== existing?.id && pick(item).trim().toLowerCase() === needle);
}
