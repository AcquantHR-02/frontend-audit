/** Backend identifiers are opaque strings on the frontend (UUID or numeric id serialised as string). */
export type Id = string;

/** ISO-8601 date, e.g. "2026-07-31". */
export type IsoDate = string;

/** ISO-8601 timestamp, e.g. "2026-07-31T10:15:00Z". */
export type IsoDateTime = string;

/** Standard audit columns carried by every persisted entity. */
export interface AuditColumns {
  createdAt: IsoDateTime;
  createdBy: Id;
  updatedAt: IsoDateTime;
  updatedBy: Id;
}

/** Lightweight reference used when an entity embeds another for display. */
export interface EntityRef {
  id: Id;
  name: string;
}
