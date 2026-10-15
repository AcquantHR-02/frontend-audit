"use client";

import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import type { AppNotification } from "@/types/domain";
import { cn } from "@/lib/utils";
import { notificationMeta } from "../utils/notification-meta";

/** One notification row: type icon, title, body, relative time; unread rows are tinted with a dot. */
export function NotificationItem({
  notification: n,
  onOpen,
  className,
}: {
  notification: AppNotification;
  onOpen: (n: AppNotification) => void;
  className?: string;
}) {
  const { icon: Icon, tone } = notificationMeta[n.type];
  const unread = !n.readAt;
  const date = parseISO(n.createdAt);

  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        unread && "bg-accent/40",
        className,
      )}
    >
      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", tone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn("flex-1 text-[13px] leading-snug", unread ? "font-semibold" : "font-medium")}>
            {n.title}
          </span>
          <time
            dateTime={n.createdAt}
            title={format(date, "d MMM yyyy, HH:mm")}
            className="shrink-0 pt-0.5 text-[11px] text-muted-foreground tabular"
          >
            {formatDistanceToNowStrict(date, { addSuffix: true })}
          </time>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
      </span>
      {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" role="status" />}
    </button>
  );
}
