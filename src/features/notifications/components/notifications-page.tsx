"use client";

import { BellIcon, CheckCheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/components/layout/page-title";
import { DataTablePagination } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import { useUrlFilter } from "@/hooks/use-url-filter";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/domain";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../api/notifications.api";
import { groupByDay } from "../utils/notification-meta";
import { NotificationItem } from "./notification-item";

/** Full notification history with an All / Unread switch (kept in the URL) and paging. */
export function NotificationsPage() {
  usePageTitle("Notifications");
  const router = useRouter();
  const table = useTableUrlState();
  const [view, setView] = useUrlFilter("view", table.resetPage);
  const unreadOnly = view === "unread";

  const { data, isLoading, isFetching } = useGetNotificationsQuery({
    unread: unreadOnly,
    page: table.request.page,
    size: table.size,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const unread = data?.unreadCount ?? 0;

  const open = (n: AppNotification) => {
    if (!n.readAt) void markRead(n.id);
    if (n.href) router.push(n.href);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        icon={BellIcon}
        description="Window openings and deadlines, submissions to review, published results and finding updates."
        actions={
          <Button variant="outline" disabled={!unread || markingAll} onClick={() => void markAllRead()}>
            {markingAll ? <Loader2Icon className="animate-spin" /> : <CheckCheckIcon />} Mark all as read
          </Button>
        }
      />

      <div role="tablist" aria-label="Filter" className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {[
          { value: "", label: "All" },
          { value: "unread", label: `Unread${unread ? ` (${unread})` : ""}` },
        ].map((t) => (
          <button
            key={t.value || "all"}
            type="button"
            role="tab"
            aria-selected={view === t.value}
            onClick={() => setView(t.value)}
            className={cn(
              "rounded-md px-4 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors",
              view === t.value && "bg-card text-foreground shadow-xs",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2 rounded-xl border bg-card p-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : !data?.content.length ? (
        <EmptyState
          icon={CheckCheckIcon}
          title="You're all caught up"
          description={unreadOnly ? "No unread notifications." : "Nothing here yet. Audit updates will appear here."}
        />
      ) : (
        <div
          className={cn(
            "rounded-xl border bg-card p-2 shadow-xs transition-opacity",
            isFetching && !isLoading && "opacity-60",
          )}
        >
          {groupByDay(data.content).map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {group.label}
              </h2>
              <div className="divide-y divide-border/60">
                {group.items.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={open} className="rounded-none py-3" />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {data && data.totalElements > 0 && (
        <DataTablePagination
          page={table.page}
          size={table.size}
          totalElements={data.totalElements}
          totalPages={data.totalPages}
          onPageChange={table.setPage}
          onSizeChange={table.setSize}
          noun="notifications"
        />
      )}
    </>
  );
}
