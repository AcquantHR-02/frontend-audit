import { assignmentsHandlers } from "./assignments.handlers";
import { auditRunsHandlers } from "./audit-runs.handlers";
import { authHandlers } from "./auth.handlers";
import { filesHandlers } from "./files.handlers";
import { findingsHandlers } from "./findings.handlers";
import { mastersHandlers } from "./masters.handlers";
import { notificationsHandlers } from "./notifications.handlers";
import { reportsHandlers } from "./reports.handlers";
import { reviewHandlers } from "./review.handlers";
import { usersHandlers } from "./users.handlers";

/** One handler file per feature; register each here. */
export const handlers = [
  ...authHandlers,
  ...mastersHandlers,
  ...assignmentsHandlers,
  ...reviewHandlers, // before audit-runs: more specific /audit-runs/:id/* routes
  ...auditRunsHandlers,
  ...findingsHandlers,
  ...reportsHandlers,
  ...usersHandlers,
  ...notificationsHandlers,
  ...filesHandlers,
];
