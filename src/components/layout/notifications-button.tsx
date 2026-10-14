"use client";

import { BellIcon, CheckCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Notification centre shell. The feed (window deadlines, Window 2 openings, pre-purge notices)
 * is wired once the backend defines its notification channel — still parked in spec §17.
 */
export function NotificationsButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <BellIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="flex flex-col items-center gap-1.5 px-6 py-8 text-center">
          <CheckCheckIcon className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">You&apos;re all caught up</p>
          <p className="text-xs text-muted-foreground">Window deadlines and audit updates will appear here.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
