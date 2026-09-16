import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheBypass, withCacheInvalidate, withSkipLoader } from '../../../core/http/http-context.tokens';
import { PagedResponse } from '../../../core/models/api-response.model';
import {
  Member,
  CreateMemberRequest,
  UpdateMemberRequest,
  UpdateMemberPasswordRequest,
  FamilyDependant,
} from './member.model';
import { environment } from '../../../../environments/environment';

const MEMBERS_CACHE_PATTERN = ['getAllMembers'];

/** Member avatar base — `pictureUrl` is a relative path (e.g. `/Images/Members/...png`); resolve against the API's origin, not `apiUrl` (which includes `/api`). */
const MEMBER_AVATAR_ORIGIN = new URL(environment.apiUrl).origin;

export function resolveMemberAvatarUrl(pictureUrl: string | null): string | null {
  if (!pictureUrl) return null;
  if (pictureUrl.startsWith('http')) return pictureUrl;
  return `${MEMBER_AVATAR_ORIGIN}${pictureUrl}`;
}

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
 * "Member" = a villa/apartment resident. Verified directly against the
 * live backend's Swagger contract and real responses (2026-09-15) — do not
 * reconcile this with the Flutter-source spec's §3.2/§7.3 documentation of
 * "addMember"/"getAllOwners" without re-checking; the spec's field list and
 * casing were wrong for several fields (MemberType/VillaType did not exist
 * in that research pass at all).
 */
@Injectable({ providedIn: 'root' })
export class MembersApiService {
  private readonly api = inject(ApiService);

  /**
   * `GET /Dashboard/getAllMembers?page=&pageSize=` — real server-side
   * pagination (confirmed 2026-09-16; was a bare array before). Each
   * page/pageSize combination is cached under its own key since it's
   * genuinely different data, not a duplicate of the same list.
   * `forceRefresh` skips a fresh cache hit (manual refresh button) while
   * still re-populating the cache with whatever comes back.
   * `withSkipLoader()` — the list page renders its own first-load skeleton
   * and an in-table `[refreshing]` indicator for every later page/refresh,
   * so this never needs the full-page overlay (confirmed 2026-09-16).
   */
  getAll(page: number, pageSize: number, forceRefresh = false): Observable<PagedResponse<Member>> {
    const context = withSkipLoader(forceRefresh ? withCacheBypass(withCache()) : withCache());
    return this.api.getPaged<Member>('Dashboard/getAllMembers', { page, pageSize }, { context });
  }

  /**
   * `POST /Dashboard/addMember`, multipart. `withSkipLoader()` — the modal's
   * own submit button already shows a `[loading]` spinner; the full-page
   * overlay is reserved for GET requests, not per-action mutations
   * (confirmed 2026-09-16).
   */
  create(payload: CreateMemberRequest): Observable<Member> {
    return this.api.post<Member>('Dashboard/addMember', toFormData(payload), {
      context: withSkipLoader(withCacheInvalidate(MEMBERS_CACHE_PATTERN)),
    });
  }

  /** `PUT /Dashboard/updateMember`, multipart. No longer carries a password field. */
  update(payload: UpdateMemberRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateMember', toFormData(payload), {
      context: withSkipLoader(withCacheInvalidate(MEMBERS_CACHE_PATTERN)),
    });
  }

  /**
   * `PUT /Dashboard/updateMemberPassword`, JSON body — a dedicated endpoint, confirmed 2026-09-16.
   * Returns a plain-text confirmation ("Password Updated Successfully") on
   * success, not JSON — same shape as `deleteMember`/`loginOwner` — so
   * `responseType: 'json'` would throw a `SyntaxError` on an otherwise-
   * successful 200 response even though the password really did change.
   */
  updatePassword(payload: UpdateMemberPasswordRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateMemberPassword', payload, {
      responseType: 'text',
      context: withSkipLoader(),
    });
  }

  /**
   * `GET /Dashboard/memberFamilyDependants/{memberId}` — bare array, not
   * cached (small, on-demand per row). `withSkipLoader()` — expanding a row
   * must never freeze the whole screen; the panel shows its own inline
   * loading state.
   */
  getFamilyDependants(memberId: number): Observable<FamilyDependant[]> {
    return this.api.getList<FamilyDependant>(`Dashboard/memberFamilyDependants/${memberId}`, {
      context: withSkipLoader(),
    });
  }

  /**
   * `DELETE /Dashboard/deleteMember?id=` — confirmed query param.
   * Returns a plain-text confirmation ("Member Deleted...") on success, not
   * JSON — same shape as `loginOwner` — so `responseType: 'json'` would
   * throw a `SyntaxError` on an otherwise-successful 200 response.
   */
  delete(id: number): Observable<void> {
    return this.api.delete<void>('Dashboard/deleteMember', {
      params: { id },
      context: withSkipLoader(withCacheInvalidate(MEMBERS_CACHE_PATTERN)),
      responseType: 'text',
    });
  }
}
