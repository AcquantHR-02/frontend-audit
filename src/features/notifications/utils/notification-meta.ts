import { isToday, isYesterday, parseISO } from "date-fns";
import {
  AlarmClockIcon,
  ArchiveIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  ClipboardCheckIcon,
  DoorOpenIcon,
  FileCheck2Icon,
  RotateCcwIcon,
  SendIcon,
  UploadIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { AppNotification, NotificationType } from "@/types/domain";

/** Icon + tint per type. Tones reuse the status palette: danger = needs action soon, success = good news. */
export const notificationMeta: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  WINDOW_OPENED: { icon: DoorOpenIcon, tone: "bg-info-subtle text-info" },
  WINDOW_CLOSING: { icon: AlarmClockIcon, tone: "bg-danger-subtle text-danger" },
  RUN_PUBLISHED: { icon: FileCheck2Icon, tone: "bg-accent text-primary" },
  FINDING_RESOLVED: { icon: CircleCheckIcon, tone: "bg-success-subtle text-success" },
  FINDING_REOPENED: { icon: RotateCcwIcon, tone: "bg-warning-subtle text-warning" },
  EVIDENCE_SUBMITTED: { icon: UploadIcon, tone: "bg-info-subtle text-info" },
  NA_PROPOSED: { icon: CircleSlashIcon, tone: "bg-neutral-subtle text-neutral" },
  REMEDIATION_SUBMITTED: { icon: WrenchIcon, tone: "bg-violet-subtle text-violet" },
  REVIEW_READY: { icon: ClipboardCheckIcon, tone: "bg-warning-subtle text-warning" },
  PUBLISH_READY: { icon: SendIcon, tone: "bg-accent text-primary" },
  RETENTION_NOTICE: { icon: ArchiveIcon, tone: "bg-danger-subtle text-danger" },
};

/** Groups (already newest-first) notifications under Today / Yesterday / Earlier. */
export function groupByDay(items: AppNotification[]) {
  const groups: { label: string; items: AppNotification[] }[] = [];
  for (const n of items) {
    const date = parseISO(n.createdAt);
    const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : "Earlier";
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}
