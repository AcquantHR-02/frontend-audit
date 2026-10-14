/**
 * Transport-level shapes shared by all endpoints.
 * Assumed contract until the backend confirms (see PROGRESS.md › Open Questions).
 */

export interface PageRequest {
  page?: number; // 0-based (Spring Data convention)
  size?: number;
  sort?: string; // e.g. "name,asc"
  search?: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Normalised error every RTK Query endpoint surfaces to the UI. */
export interface ApiError {
  status: number;
  message: string;
  /** Machine-readable code, e.g. "ASSIGNMENT_NOT_FOUND" (spec §15.9 two-tier error). */
  code?: string;
  /** Field-level validation errors, keyed by field name. */
  fieldErrors?: Record<string, string>;
}
