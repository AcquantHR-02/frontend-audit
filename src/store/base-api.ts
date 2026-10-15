import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./base-query";

/**
 * The one RTK Query API slice. Features add endpoints with
 * `baseApi.injectEndpoints({...})` inside `features/<name>/api/*.api.ts`,
 * which keeps endpoints code-split and colocated with their feature.
 * Pass `overrideExisting: process.env.NODE_ENV === "development"` so Fast Refresh can re-register them.
 *
 * Tags drive cache invalidation across features, e.g. stamping an AIR
 * invalidates `AuditItem`, `AuditRun` (score) and `Dashboard`.
 */
export const TAG_TYPES = [
  "Session",
  "User",
  "State",
  "Act",
  "PrincipalEmployer",
  "PEUnit",
  "Vendor",
  "ChecklistItem",
  "PEChecklistItem",
  "VendorUnitAssignment",
  "VendorChecklistAssignment",
  "PEChecklistAssignment",
  "AuditRun",
  "AuditItem",
  "Evidence",
  "Finding",
  "Dashboard",
  "Report",
  "AuditTrail",
  "Notification",
] as const;
export type TagType = (typeof TAG_TYPES)[number];

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
});
