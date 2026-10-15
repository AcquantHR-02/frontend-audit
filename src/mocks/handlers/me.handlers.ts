import { http, HttpResponse } from "msw";
import { authenticate } from "../auth";
import { db, persist } from "../db";
import { apiUrl, errorResponse, networkDelay, newId, nowIso } from "../utils";

const MAX_VIEWS_PER_LIST = 20;

/** The signed-in user's own preferences: saved list views. */
export const meHandlers = [
  http.get(apiUrl("/me/views"), async ({ request }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    const scope = new URL(request.url).searchParams.get("scope");
    return HttpResponse.json(
      db.savedViews
        .filter((v) => v.userId === user.id && (!scope || v.scope === scope))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }),

  http.post(apiUrl("/me/views"), async ({ request }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    const body = (await request.json()) as { scope?: string; name?: string; query?: string };
    const name = body.name?.trim() ?? "";
    const mine = db.savedViews.filter((v) => v.userId === user.id && v.scope === body.scope);
    const fieldErrors: Record<string, string> = {};
    if (!name) fieldErrors.name = "Give the view a name";
    else if (name.length > 40) fieldErrors.name = "Keep the name under 40 characters";
    else if (mine.some((v) => v.name.toLowerCase() === name.toLowerCase()))
      fieldErrors.name = "You already have a view with this name";
    if (!body.scope || !body.query) fieldErrors.query = "Apply a filter before saving a view";
    if (mine.length >= MAX_VIEWS_PER_LIST) fieldErrors.name = `You can keep up to ${MAX_VIEWS_PER_LIST} views per list`;
    if (Object.keys(fieldErrors).length) {
      return errorResponse(400, Object.values(fieldErrors)[0], { code: "VALIDATION_FAILED", fieldErrors });
    }
    const view = {
      id: newId("view"),
      userId: user.id,
      scope: body.scope!,
      name,
      query: body.query!,
      createdAt: nowIso(),
    };
    db.savedViews.push(view);
    persist();
    return HttpResponse.json(view, { status: 201 });
  }),

  http.delete(apiUrl("/me/views/:id"), async ({ request, params }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    const index = db.savedViews.findIndex((v) => v.id === params.id && v.userId === user.id);
    if (index === -1) return errorResponse(404, "View not found.");
    db.savedViews.splice(index, 1);
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
];
