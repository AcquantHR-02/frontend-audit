"use client";

import { MoreHorizontalIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  /** Draws a separator above this item. */
  separated?: boolean;
  hidden?: boolean;
}

/** "⋯" menu for a table row. Clicks don't bubble to clickable rows. */
export function RowActions({ actions, label = "Row actions" }: { actions: RowAction[]; label?: string }) {
  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        {visible.map((action) => (
          <div key={action.label}>
            {action.separated && <DropdownMenuSeparator />}
            <DropdownMenuItem variant={action.destructive ? "destructive" : "default"} onSelect={action.onSelect}>
              <action.icon aria-hidden />
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
