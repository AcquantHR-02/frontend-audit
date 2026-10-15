import { formatScore, nextPurgeDate, purgeNotice } from "@/lib/domain";
import { formatDate, formatDateRange } from "@/lib/utils";
import type { AppNotification, AuditRun, NotificationType, User } from "@/types/domain";
import { db } from "./db";
import { toRunView } from "./handlers/audit-runs.handlers";
import { newId, nowIso, todayIso } from "./utils";

/**
 * Mock notification engine. Two sources, like a real backend would have:
 *  1. Events — pushed by handlers when something happens (upload, remediation, finding status).
 *  2. Schedules — date-driven ("Window 1 is open", "closes in 2 days", "ready to publish"),
 *     materialised for a user when they read their notifications, with stable ids so each one
 *     is created exactly once.
 */

const DAY = 86_400_000;
const LOOKBACK_DAYS = 90;
/** Scheduled notifications older than this arrive already read, so a fresh demo isn't a wall of unread. */
const AUTO_READ_AFTER_DAYS = 10;
const MAX_PER_USER = 200;

const isAuditor = (u: User) => u.role === "AUDITOR_ADMIN" || u.role === "AUDITOR_USER";

export const auditorRecipients = () => db.users.filter((u) => u.isActive && isAuditor(u));

/** The audited party's own users: vendor users of the vendor, or PE users of the PE. */
export function partyRecipients(run: AuditRun) {
  return db.users.filter(
    (u) =>
      u.isActive &&
      (run.auditType === "VENDOR"
        ? u.role === "VENDOR_USER" && u.vendorId === run.vendorId
        : u.role === "PE_USER" && u.peId === run.peId),
  );
}

interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
}

/** Event notification for each recipient (skips the actor — nobody needs to hear about their own action). */
export function notify(recipients: User[], input: NotificationInput, actorId?: string) {
  const createdAt = nowIso();
  for (const user of recipients) {
    if (user.id === actorId) continue;
    db.notifications.unshift({ id: newId("ntf"), userId: user.id, createdAt, readAt: null, ...input });
  }
  trim();
}

function trim() {
  const perUser = new Map<string, number>();
  db.notifications = db.notifications.filter((n) => {
    const count = (perUser.get(n.userId) ?? 0) + 1;
    perUser.set(n.userId, count);
    return count <= MAX_PER_USER;
  });
}

/** 09:00 UTC on the given day, but never in the future (a notice due today can't be "in 2 hours"). */
const atNine = (date: string) => {
  const nine = `${date}T09:00:00.000Z`;
  const now = nowIso();
  return nine < now ? nine : now;
};
const addDays = (date: string, days: number) => new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

/** Create (once) every date-driven notification due for this user by today. */
export function syncScheduledNotifications(user: User) {
  const today = todayIso();
  const since = addDays(today, -LOOKBACK_DAYS);
  const existing = new Set(db.notifications.filter((n) => n.userId === user.id).map((n) => n.id));
  const due: AppNotification[] = [];

  const add = (key: string, createdAt: string, input: NotificationInput) => {
    const id = `sched:${key}:${user.id}`;
    if (existing.has(id) || createdAt.slice(0, 10) > today || createdAt.slice(0, 10) < since) return;
    const old = daysBetween(createdAt.slice(0, 10), today) > AUTO_READ_AFTER_DAYS;
    due.push({ id, userId: user.id, createdAt, readAt: old ? createdAt : null, ...input });
  };

  if (isAuditor(user)) {
    for (const run of db.auditRuns) {
      if (run.publishedAt) continue;
      const view = toRunView(run);
      const href = `/audit-runs/${run.id}`;
      if (["REVIEW", "WINDOW_2", "FINAL_REVIEW"].includes(view.phase)) {
        const started = run.reviewStart ?? addDays(run.window1End, 1);
        const submitted = db.airs.filter((a) => a.runId === run.id && a.submissionStatus === "SUBMITTED").length;
        add(`review:${run.id}`, atNine(started), {
          type: "REVIEW_READY",
          title: `${run.code} is ready for review`,
          body: `${view.partyName} · ${view.unitCode}: Window 1 has closed${submitted ? ` with ${submitted} item${submitted === 1 ? "" : "s"} submitted` : ""}. Stamp each item C / NA / NC.`,
          href,
        });
      }
      if (view.phase === "FINAL_REVIEW") {
        const started = run.finalReviewStart ?? (run.window2End ? addDays(run.window2End, 1) : today);
        add(`publish:${run.id}`, atNine(started), {
          type: "PUBLISH_READY",
          title: `${run.code} is ready to publish`,
          body: `${view.partyName} · ${view.unitCode} reached Final review. Check the stamps and publish.`,
          href,
        });
      }
    }
    const notice = purgeNotice(today);
    if (notice) {
      const purge = nextPurgeDate(today);
      add(`retention:${purge}:${notice.level}`, atNine(today), {
        type: "RETENTION_NOTICE",
        title: `Data purge in ${notice.days} days`,
        body: `Runs that ended in older financial years are purged on ${formatDate(purge)}. Export anything you need to keep.`,
        href: "/admin/retention",
      });
    }
  } else {
    for (const run of db.auditRuns) {
      if (!partyRecipients(run).some((u) => u.id === user.id)) continue;
      const view = toRunView(run);
      const href = `/audit-runs/${run.id}`;
      const where = `${run.code} · ${view.unitCode} (${formatDateRange(run.activityPeriodStart, run.activityPeriodEnd)})`;

      add(`w1open:${run.id}`, atNine(run.window1Start), {
        type: "WINDOW_OPENED",
        title: "Window 1 is open",
        body: `${where}: upload evidence for ${view.score.assignedTotal} items by ${formatDate(run.window1End)}.`,
        href,
      });
      if (view.phase === "WINDOW_1") {
        add(`w1closing:${run.id}`, atNine(addDays(run.window1End, -2)), {
          type: "WINDOW_CLOSING",
          title: "Window 1 closes soon",
          body: `${where}: uploads close on ${formatDate(run.window1End)}.`,
          href,
        });
      }
      if (run.window2Start && run.window2End) {
        add(`w2open:${run.id}`, atNine(run.window2Start), {
          type: "WINDOW_OPENED",
          title: "Window 2 is open",
          body: `${where}: fix not-complied and unstamped items by ${formatDate(run.window2End)}.`,
          href,
        });
        if (view.phase === "WINDOW_2") {
          add(`w2closing:${run.id}`, atNine(addDays(run.window2End, -2)), {
            type: "WINDOW_CLOSING",
            title: "Window 2 closes soon",
            body: `${where}: uploads close on ${formatDate(run.window2End)}.`,
            href,
          });
        }
      }
      if (run.publishedAt) {
        const findings = db.findings.filter((f) => db.airs.find((a) => a.id === f.airId)?.runId === run.id).length;
        add(`published:${run.id}`, run.publishedAt, {
          type: "RUN_PUBLISHED",
          title: `Results published · ${formatScore(view.score)}`,
          body: `${where}: ${findings ? (findings === 1 ? "1 finding opened, remediate it under Findings." : `${findings} findings opened, remediate them under Findings.`) : "no findings. Well done."}`,
          href: findings ? "/findings?status=OPEN" : href,
        });
      }
    }
  }

  if (due.length) {
    db.notifications.push(...due);
    db.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    trim();
  }
  return due.length > 0;
}
