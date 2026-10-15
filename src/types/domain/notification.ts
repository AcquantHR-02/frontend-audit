import type { Id, IsoDateTime } from "./common";

/**
 * In-app notifications (spec §17 parks the delivery channel; in-app is the first one).
 * Each notification belongs to exactly one recipient user.
 */
export const NotificationType = {
  // Audited party (vendor / PE users)
  WINDOW_OPENED: "WINDOW_OPENED", // Window 1 or Window 2 is open for uploads
  WINDOW_CLOSING: "WINDOW_CLOSING", // an open window closes within 2 days
  RUN_PUBLISHED: "RUN_PUBLISHED", // results are final; findings opened for NC items
  FINDING_RESOLVED: "FINDING_RESOLVED",
  FINDING_REOPENED: "FINDING_REOPENED",
  // Auditors
  EVIDENCE_SUBMITTED: "EVIDENCE_SUBMITTED",
  NA_PROPOSED: "NA_PROPOSED",
  REMEDIATION_SUBMITTED: "REMEDIATION_SUBMITTED",
  REVIEW_READY: "REVIEW_READY", // Window 1 closed; the run is in review
  PUBLISH_READY: "PUBLISH_READY", // run reached Final review
  RETENTION_NOTICE: "RETENTION_NOTICE", // 30 / 7 days before a purge (§12.14)
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface AppNotification {
  id: Id;
  userId: Id;
  type: NotificationType;
  title: string;
  body: string;
  /** In-app route to open, e.g. "/audit-runs/run-1". */
  href: string | null;
  createdAt: IsoDateTime;
  /** null = unread. */
  readAt: IsoDateTime | null;
}

/** GET /notifications response: a page plus the user's total unread count (drives the bell badge). */
export interface NotificationPage {
  content: AppNotification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  unreadCount: number;
}
