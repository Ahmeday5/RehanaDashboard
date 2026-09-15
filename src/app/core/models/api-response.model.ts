/**
 * Rehana's REST backend never wraps a payload in `{data: ...}` — every
 * response is one of three shapes (spec §2), so `ApiResponse<T>` and the
 * generic-envelope `unwrap()` logic from the original starter don't apply
 * here and were removed rather than left as dead code.
 */

/** Backend validation errors keyed by field name. */
export type ApiFieldErrors = Record<string, string[] | string>;

/** Normalized error surfaced to the rest of the app. */
export interface ApiError {
  status: number;
  code?: string;
  message: string;
  fieldErrors?: ApiFieldErrors;
  raw?: unknown;
}

/**
 * Paged list envelope — confirmed shape for every paginated Rehana endpoint
 * (owners-by-page, member accounts, bonds, compound bonds, invitations —
 * spec §3.5/§3.6/§3.8): `{items, page, pageSize, totalItems, totalPages}`.
 * Distinct from a bare-array endpoint (`/Dashboard/list`,
 * `GetBondsSummaryByYearByVillaNumber`) — use `ApiService.getList<T>()` for
 * those instead of guessing the shape at runtime, unlike the Flutter code's
 * scattered `response is List` checks (spec §3.8).
 */
export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PagedQuery {
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}
