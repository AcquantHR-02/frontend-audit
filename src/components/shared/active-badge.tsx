import { StatusBadge } from "./status-badge";

export function ActiveBadge({ active, inactiveLabel = "Inactive" }: { active: boolean; inactiveLabel?: string }) {
  return <StatusBadge tone={active ? "success" : "neutral"} label={active ? "Active" : inactiveLabel} />;
}
