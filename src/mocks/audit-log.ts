import type { User } from "@/types/domain";
import { db } from "./db";

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string; // e.g. "RUN_CREATED", "EVIDENCE_UPLOADED"
  entityType: string; // e.g. "AuditRun"
  entityId: string;
  summary: string;
}

const MAX_EVENTS = 1500;

/** §12.13 audit trail (mock): append-only, newest first, capped to keep localStorage small. */
export function logEvent(
  user: Pick<User, "id" | "fullName" | "role">,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
) {
  db.auditTrail.unshift({
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action,
    entityType,
    entityId,
    summary,
  });
  if (db.auditTrail.length > MAX_EVENTS) db.auditTrail.length = MAX_EVENTS;
}
