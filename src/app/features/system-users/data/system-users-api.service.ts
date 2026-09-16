import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { withCacheInvalidate, withCache, withCacheBypass, withSkipLoader } from '../../../core/http/http-context.tokens';
import { PagedResponse } from '../../../core/models/api-response.model';
import {
  CreateSystemUserRequest,
  SystemUser,
  UpdateSystemUserRequest,
  UpdateSystemUserPasswordRequest,
} from './system-user.model';

const SYSTEM_USERS_CACHE_PATTERN = ['getAllOwners'];

/**
 * "Owner" in this backend's URL naming = an Admin/Account Manager who runs
 * the dashboard — confirmed directly against the live API, verbatim
 * request/response shapes (2026-09-15). Do not rename these endpoint paths
 * to match the "system user" terminology used in the UI/models — the URLs
 * are the backend's actual contract.
 */
@Injectable({ providedIn: 'root' })
export class SystemUsersApiService {
  private readonly api = inject(ApiService);

  /**
   * `GET /Dashboard/getAllOwners?page=&pageSize=` — real server-side
   * pagination (confirmed 2026-09-16; was a bare array before). Each
   * page/pageSize combination is cached under its own key since it's
   * genuinely different data, not a duplicate of the same list.
   * `forceRefresh` skips a fresh cache hit (manual refresh button) while
   * still re-populating the cache with whatever comes back.
   * `withSkipLoader()` — the list page renders its own first-load skeleton
   * and an in-table `[refreshing]` indicator for every later page/refresh,
   * so this never needs the full-page overlay (confirmed 2026-09-16).
   */
  getAll(page: number, pageSize: number, forceRefresh = false): Observable<PagedResponse<SystemUser>> {
    const context = withSkipLoader(forceRefresh ? withCacheBypass(withCache()) : withCache());
    return this.api.getPaged<SystemUser>('Dashboard/getAllOwners', { page, pageSize }, { context });
  }

  /**
   * `POST /Dashboard/addOwner`. `withSkipLoader()` — the modal's own submit
   * button already shows a `[loading]` spinner; the full-page overlay is
   * reserved for GET requests, not per-action mutations (confirmed 2026-09-16).
   */
  create(payload: CreateSystemUserRequest): Observable<SystemUser> {
    return this.api.post<SystemUser>('Dashboard/addOwner', payload, {
      context: withSkipLoader(withCacheInvalidate(SYSTEM_USERS_CACHE_PATTERN)),
    });
  }

  /**
   * `PUT /Dashboard/updateOwner?id={id}` — id sent as a query param as an
   * agreed placeholder; the backend team hasn't finished wiring this
   * endpoint's id handling yet (confirmed 2026-09-15). No longer carries a
   * password field.
   */
  update(id: string, payload: UpdateSystemUserRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateOwner', payload, {
      params: { id },
      context: withSkipLoader(withCacheInvalidate(SYSTEM_USERS_CACHE_PATTERN)),
    });
  }

  /**
   * `PUT /Dashboard/updateOwnerPassword`, JSON body — a dedicated endpoint, confirmed 2026-09-16.
   * Returns a plain-text confirmation ("Password Updated Successfully") on
   * success, not JSON — same shape as `updateMemberPassword`/`deleteOwner`
   * — so `responseType: 'json'` would throw a `SyntaxError` on an
   * otherwise-successful 200 response.
   */
  updatePassword(payload: UpdateSystemUserPasswordRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateOwnerPassword', payload, {
      responseType: 'text',
      context: withSkipLoader(),
    });
  }

  /**
   * `DELETE /Dashboard/deleteOwner/{id}` — id as a path segment, confirmed.
   * Returns a plain-text confirmation on success, not JSON — same shape as
   * `loginOwner` — so `responseType: 'json'` would throw a `SyntaxError`
   * on an otherwise-successful 200 response.
   */
  delete(id: string): Observable<void> {
    return this.api.delete<void>(`Dashboard/deleteOwner/${id}`, {
      context: withSkipLoader(withCacheInvalidate(SYSTEM_USERS_CACHE_PATTERN)),
      responseType: 'text',
    });
  }
}
