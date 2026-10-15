import { http, HttpResponse } from "msw";
import { Permission } from "@/lib/auth";
import type { NotificationPage } from "@/types/domain";
import { requireUser } from "../crud";
import { db, persist } from "../db";
import { syncScheduledNotifications } from "../notifications";
import { apiUrl, errorResponse, networkDelay, nowIso } from "../utils";

/** In-app notifications for the signed-in user only. */
export const notificationsHandlers = [
  /** `?unread=true&page&size` — newest first, plus the unread total for the bell badge. */
  http.get(apiUrl("/notifications"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.DASHBOARD_VIEW);
    if (user instanceof Response) return user;
    if (syncScheduledNotifications(user)) persist();

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));
    const size = Math.min(100, Math.max(1, Number(url.searchParams.get("size") ?? 20)));
    const mine = db.notifications.filter((n) => n.userId === user.id);
    const rows = unreadOnly ? mine.filter((n) => !n.readAt) : mine;

    const body: NotificationPage = {
      content: rows.slice(page * size, page * size + size),
      page,
      size,
      totalElements: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / size)),
      unreadCount: mine.filter((n) => !n.readAt).length,
    };
    return HttpResponse.json(body);
  }),

  http.post(apiUrl("/notifications/:id/read"), async ({ request, params }) => {
    await networkDelay();
    const user = requireUser(request, Permission.DASHBOARD_VIEW);
    if (user instanceof Response) return user;
    const notification = db.notifications.find((n) => n.id === params.id && n.userId === user.id);
    if (!notification) return errorResponse(404, "Notification not found.");
    notification.readAt ??= nowIso();
    persist();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(apiUrl("/notifications/read-all"), async ({ request }) => {
    await networkDelay();
    const user = requireUser(request, Permission.DASHBOARD_VIEW);
    if (user instanceof Response) return user;
    const now = nowIso();
    for (const n of db.notifications) if (n.userId === user.id && !n.readAt) n.readAt = now;
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
];
