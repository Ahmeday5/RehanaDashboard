import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { withCacheInvalidate, withCache } from '../../../core/http/http-context.tokens';
import { CreateSystemUserRequest, SystemUser, UpdateSystemUserRequest } from './system-user.model';

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

  /** `GET /Dashboard/getAllOwners` — bare array, confirmed NO pagination envelope on this backend. */
  getAll(): Observable<SystemUser[]> {
    return this.api.getList<SystemUser>('Dashboard/getAllOwners', { context: withCache() });
  }

  /** `POST /Dashboard/addOwner`. */
  create(payload: CreateSystemUserRequest): Observable<SystemUser> {
    return this.api.post<SystemUser>('Dashboard/addOwner', payload, {
      context: withCacheInvalidate(SYSTEM_USERS_CACHE_PATTERN),
    });
  }

  /**
   * `PUT /Dashboard/updateOwner?id={id}` — id sent as a query param as an
   * agreed placeholder; the backend team hasn't finished wiring this
   * endpoint's id handling yet (confirmed 2026-09-15).
   */
  update(id: string, payload: UpdateSystemUserRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateOwner', payload, {
      params: { id },
      context: withCacheInvalidate(SYSTEM_USERS_CACHE_PATTERN),
    });
  }

  /** `DELETE /Dashboard/deleteOwner/{id}` — id as a path segment, confirmed. */
  delete(id: string): Observable<void> {
    return this.api.delete<void>(`Dashboard/deleteOwner/${id}`, {
      context: withCacheInvalidate(SYSTEM_USERS_CACHE_PATTERN),
    });
  }
}
