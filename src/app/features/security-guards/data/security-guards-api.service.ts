import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheInvalidate } from '../../../core/http/http-context.tokens';
import { SecurityGuard, CreateSecurityGuardRequest, UpdateSecurityGuardRequest } from './security-guard.model';

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

  /** `GET /Dashboard/getAllSecurityGuards` — bare array, no pagination envelope. */
  getAll(): Observable<SecurityGuard[]> {
    return this.api.getList<SecurityGuard>('Dashboard/getAllSecurityGuards', { context: withCache() });
  }

  /** `POST /Dashboard/addSecurityGuard`, multipart. */
  create(payload: CreateSecurityGuardRequest): Observable<SecurityGuard> {
    return this.api.post<SecurityGuard>('Dashboard/addSecurityGuard', toFormData(payload), {
      context: withCacheInvalidate(SECURITY_GUARDS_CACHE_PATTERN),
    });
  }

  /** `PUT /Dashboard/updateSecurityGuard`, multipart. */
  update(payload: UpdateSecurityGuardRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateSecurityGuard', toFormData(payload), {
      context: withCacheInvalidate(SECURITY_GUARDS_CACHE_PATTERN),
    });
  }

  /** `DELETE /Dashboard/deleteSecurityGuard?id=` — confirmed query param. */
  delete(id: number): Observable<void> {
    return this.api.delete<void>('Dashboard/deleteSecurityGuard', {
      params: { id },
      context: withCacheInvalidate(SECURITY_GUARDS_CACHE_PATTERN),
    });
  }
}
