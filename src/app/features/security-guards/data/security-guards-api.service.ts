import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheBypass, withCacheInvalidate, withSkipLoader } from '../../../core/http/http-context.tokens';
import { PagedResponse } from '../../../core/models/api-response.model';
import {
  SecurityGuard,
  CreateSecurityGuardRequest,
  UpdateSecurityGuardRequest,
  UpdateSecurityGuardPasswordRequest,
} from './security-guard.model';

const SECURITY_GUARDS_CACHE_PATTERN = ['getAllSecurityGuards'];

function toFormData(payload: object): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue;
    if (value instanceof File) {
      form.append(key, value);
    } else {
      form.append(key, String(value));
    }
  }
  return form;
}

/**
 * Security guard `pictureUrl` is used AS-IS, no base-URL prepending
 * (confirmed spec §3.4 and the live response shape) — the opposite
 * convention from Members' avatars. Do not silently unify the two.
 */
export function resolveSecurityGuardAvatarUrl(pictureUrl: string | null): string | null {
  return pictureUrl;
}

/** Verified directly against the live backend's Swagger contract (2026-09-15). */
@Injectable({ providedIn: 'root' })
export class SecurityGuardsApiService {
  private readonly api = inject(ApiService);

  /**
   * `GET /Dashboard/getAllSecurityGuards?page=&pageSize=` — real server-side
   * pagination (confirmed 2026-09-16; was a bare array before). Each
   * page/pageSize combination is cached under its own key since it's
   * genuinely different data, not a duplicate of the same list.
   * `forceRefresh` skips a fresh cache hit (manual refresh button) while
   * still re-populating the cache with whatever comes back.
   * `withSkipLoader()` — the list page renders its own first-load skeleton
   * and an in-table `[refreshing]` indicator for every later page/refresh,
   * so this never needs the full-page overlay (confirmed 2026-09-16).
   */
  getAll(page: number, pageSize: number, forceRefresh = false): Observable<PagedResponse<SecurityGuard>> {
    const context = withSkipLoader(forceRefresh ? withCacheBypass(withCache()) : withCache());
    return this.api.getPaged<SecurityGuard>('Dashboard/getAllSecurityGuards', { page, pageSize }, { context });
  }

  /**
   * `POST /Dashboard/addSecurityGuard`, multipart. `withSkipLoader()` — the
   * modal's own submit button already shows a `[loading]` spinner; the
   * full-page overlay is reserved for GET requests, not per-action
   * mutations (confirmed 2026-09-16).
   */
  create(payload: CreateSecurityGuardRequest): Observable<SecurityGuard> {
    return this.api.post<SecurityGuard>('Dashboard/addSecurityGuard', toFormData(payload), {
      context: withSkipLoader(withCacheInvalidate(SECURITY_GUARDS_CACHE_PATTERN)),
    });
  }

  /** `PUT /Dashboard/updateSecurityGuard`, multipart. No longer carries a password field. */
  update(payload: UpdateSecurityGuardRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateSecurityGuard', toFormData(payload), {
      context: withSkipLoader(withCacheInvalidate(SECURITY_GUARDS_CACHE_PATTERN)),
    });
  }

  /**
   * `PUT /Dashboard/updateSecurityGuardPassword`, JSON body — a dedicated endpoint, confirmed 2026-09-16.
   * Returns a plain-text confirmation on success, not JSON — same shape as
   * `updateMemberPassword`/`deleteSecurityGuard` — so `responseType: 'json'`
   * would throw a `SyntaxError` on an otherwise-successful 200 response.
   */
  updatePassword(payload: UpdateSecurityGuardPasswordRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateSecurityGuardPassword', payload, {
      responseType: 'text',
      context: withSkipLoader(),
    });
  }

  /**
   * `DELETE /Dashboard/deleteSecurityGuard?id=` — confirmed query param.
   * Returns a plain-text confirmation on success, not JSON — same shape as
   * `loginOwner` — so `responseType: 'json'` would throw a `SyntaxError`
   * on an otherwise-successful 200 response.
   */
  delete(id: number): Observable<void> {
    return this.api.delete<void>('Dashboard/deleteSecurityGuard', {
      params: { id },
      context: withSkipLoader(withCacheInvalidate(SECURITY_GUARDS_CACHE_PATTERN)),
      responseType: 'text',
    });
  }
}
