import { Observable, EMPTY } from 'rxjs';
import { map, expand, reduce } from 'rxjs/operators';
import { PagedResponse } from '../models/api-response.model';

/**
 * Coerces any list-shaped response into a plain array. Tolerates every
 * shape actually seen on Rehana's backend (spec §2/§3.8) so a single rogue
 * endpoint doesn't blow up an `@for` that consumes it:
 *
 *   - `T[]`                                       → as-is (bare-array endpoints, e.g. `/Dashboard/list`)
 *   - `{ items: T[], page, pageSize, ... }`       → paged envelope (owners, bonds, invitations, ...)
 *   - anything else (null, 404, error body, …)    → `[]`
 */
export function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
}

/**
 * RxJS operator: normalize a list-shaped response stream to `T[]`.
 *
 *   this.api.get<unknown>(url).pipe(toList<Product>())
 */
export function toList<T>() {
  return (source$: Observable<unknown>): Observable<T[]> =>
    source$.pipe(map((v) => asList<T>(v)));
}

const EMPTY_PAGED: PagedResponse<never> = {
  page: 1,
  pageSize: 0,
  totalItems: 0,
  totalPages: 0,
  items: [],
};

/**
 * Normalizes any "paged" response shape into a canonical `PagedResponse<T>`
 * (`{items, page, pageSize, totalItems, totalPages}` — spec §3.5/§3.6/§3.8):
 *
 *   - `{ items, page, pageSize, totalItems, totalPages }` → as-is
 *   - `T[]`                                               → wrap as a single page
 *   - anything else (null, error body, missing fields, …) → empty page
 *
 * Pair with `toPaged<T>()` when piping a service observable.
 */
export function asPaged<T>(value: unknown): PagedResponse<T> {
  if (Array.isArray(value)) {
    return { ...EMPTY_PAGED, pageSize: value.length, totalItems: value.length, totalPages: 1, items: value as T[] };
  }
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_PAGED, items: [] as T[] };
  }

  const candidate = value as Partial<PagedResponse<T>>;
  if (Array.isArray(candidate.items)) {
    return {
      page: typeof candidate.page === 'number' ? candidate.page : 1,
      pageSize: typeof candidate.pageSize === 'number' ? candidate.pageSize : candidate.items.length,
      totalItems: typeof candidate.totalItems === 'number' ? candidate.totalItems : candidate.items.length,
      totalPages: typeof candidate.totalPages === 'number' ? candidate.totalPages : 1,
      items: candidate.items,
    };
  }

  return { ...EMPTY_PAGED, items: [] as T[] };
}

/**
 * RxJS operator: normalize a paged response stream to `PagedResponse<T>`.
 *
 *   this.api.get<unknown>(url).pipe(toPaged<Item>())
 */
export function toPaged<T>() {
  return (source$: Observable<unknown>): Observable<PagedResponse<T>> =>
    source$.pipe(map((v) => asPaged<T>(v)));
}

/** Default page size used when draining a paginated endpoint — matches Rehana's own convention (spec §3.6). */
export const FETCH_ALL_PAGE_SIZE = 20;
/**
 * Hard ceiling on page requests so a backend that mis-reports `totalPages`
 * (or `totalItems`) can never spin this into an infinite request loop.
 */
export const FETCH_ALL_MAX_PAGES = 50;

/**
 * Drains *every* page of a server-paginated endpoint into a single flat
 * array — the safe replacement for the "one oversized `pageSize: 1000`
 * page" trick that silently truncates once the real row count grows past
 * the hard-coded number.
 *
 * `fetchPage(page, pageSize)` must resolve to a canonical `PagedResponse<T>`
 * (normalize with `asPaged`/`toPaged` inside the callback when the endpoint
 * nests its page). Iteration walks pages sequentially from 1 and stops at
 * the first of:
 *
 *   - a short page (fewer rows than `pageSize` → last page reached)
 *   - the reported `totalPages`
 *   - the `maxPages` safety cap
 *
 * so a single tolerant pass works whether the backend reports `totalPages`,
 * only `totalItems`, or neither.
 */
export function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Observable<PagedResponse<T>>,
  pageSize: number = FETCH_ALL_PAGE_SIZE,
  maxPages: number = FETCH_ALL_MAX_PAGES,
): Observable<T[]> {
  return fetchPage(1, pageSize).pipe(
    expand((page) => {
      const rows = page.items?.length ?? 0;
      const next = (page.page || 1) + 1;
      // Detect a server-side page-size cap: if we asked for 20 but the
      // backend honoured only 10, treat 10 as the threshold for a "short"
      // (i.e. last) page — otherwise we'd see 10 < 20, declare ourselves
      // done, and silently drop everything after row 10.
      const serverPageSize = page.pageSize > 0 ? page.pageSize : pageSize;
      const effectiveSize = Math.min(pageSize, serverPageSize);
      // When `totalItems` is reported, trust it: keep going until we've
      // accumulated every row the server says exists — even if a single
      // page came back short due to a server quirk.
      const haveMoreByCount =
        page.totalItems > 0 && (page.page || 1) * effectiveSize < page.totalItems;
      const lastPageReached =
        rows === 0 ||
        next > maxPages ||
        (page.totalPages > 0 && next > page.totalPages) ||
        (!haveMoreByCount && rows < effectiveSize);
      return lastPageReached ? EMPTY : fetchPage(next, effectiveSize);
    }),
    reduce((acc, page) => acc.concat(page.items ?? []), [] as T[]),
  );
}
