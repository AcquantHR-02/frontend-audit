import { http, HttpResponse } from "msw";
import { authenticate } from "../auth";
import { db } from "../db";
import { apiUrl, networkDelay, paginate } from "../utils";

/** Read endpoints for reference/master data. CRUD lands in Step 3. */
export const mastersHandlers = [
  http.get(apiUrl("/states"), async ({ request }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    return HttpResponse.json(db.states);
  }),

  http.get(apiUrl("/acts"), async ({ request }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    return HttpResponse.json(paginate(db.acts, new URL(request.url), ["name", "shortName"]));
  }),

  http.get(apiUrl("/vendors"), async ({ request }) => {
    await networkDelay();
    const user = authenticate(request);
    if (user instanceof Response) return user;
    return HttpResponse.json(paginate(db.vendors, new URL(request.url), ["name"]));
  }),
];
