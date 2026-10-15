"use client";

import { BellIcon, CheckCheckIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/domain";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../api/notifications.api";
import { groupByDay } from "../utils/notification-meta";
import { NotificationItem } from "./notification-item";

const POLL_MS = 60_000;
const PREVIEW_SIZE = 10;

/** Header bell: unread badge, latest notifications grouped by day, toast when new ones arrive. */
export function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");

  // Always-on (polled) query drives the badge and the "new notification" toast.
  const latest = useGetNotificationsQuery(
    { size: PREVIEW_SIZE },
    { pollingInterval: POLL_MS, skipPollingIfUnfocused: true },
  );
  const unreadList = useGetNotificationsQuery(
    { size: PREVIEW_SIZE, unread: true },
    { skip: !open || tab !== "unread" },
  );
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const unread = latest.data?.unreadCount ?? 0;
  const list = tab === "unread" ? unreadList : latest;
  const items = list.data?.content ?? [];

  const openNotification = (n: AppNotification) => {
    if (!n.readAt) void markRead(n.id);
    setOpen(false);
    if (n.href) router.push(n.href);
  };

  // Toast only when the unread count goes up after the first load (not on page load).
  const previous = useRef<number | undefined>(undefined);
  useEffect(() => {
    const count = latest.data?.unreadCount;
    if (count === undefined) return;
    if (previous.current !== undefined && count > previous.current) {
      const newest = latest.data?.content.find((n) => !n.readAt);
      if (newest) {
        toast(newest.title, {
          description: newest.body,
          action: { label: "View", onClick: () => openNotification(newest) },
        });
      }
    }
    previous.current = count;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to new counts only
  }, [latest.data?.unreadCount]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <BellIcon className={cn(unread > 0 && "origin-top animate-[bell-ring_1s_ease-in-out_1]")} />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-white tabular ring-2 ring-background"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[380px] max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary tabular">
              {unread} new
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs"
            disabled={!unread || markingAll}
            onClick={() => void markAllRead()}
          >
            {markingAll ? <Loader2Icon className="animate-spin" /> : <CheckCheckIcon />} Mark all read
          </Button>
        </div>

        <div role="tablist" aria-label="Filter" className="mx-3 mt-2.5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "rounded-md py-1 text-xs font-medium text-muted-foreground transition-colors",
                tab === value && "bg-card text-foreground shadow-xs",
              )}
            >
              {value === "all" ? "All" : `Unread${unread ? ` (${unread})` : ""}`}
            </button>
          ))}
        </div>

        <div className="max-h-[420px] overflow-y-auto overscroll-contain px-1.5 py-2">
          {list.isLoading ? (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" aria-label="Loading" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
              <span className="mb-1 grid size-10 place-items-center rounded-full bg-success-subtle text-success">
                <CheckCheckIcon className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-medium">You&apos;re all caught up</p>
              <p className="text-xs text-muted-foreground">
                {tab === "unread" ? "No unread notifications." : "Window deadlines and audit updates will appear here."}
              </p>
            </div>
          ) : (
            groupByDay(items).map((group) => (
              <section key={group.label} aria-label={group.label}>
                <h3 className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </h3>
                {group.items.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={openNotification} />
                ))}
              </section>
            ))
          )}
        </div>

        <div className="border-t p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs">
            <Link href="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
