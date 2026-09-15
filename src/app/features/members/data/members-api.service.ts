import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheInvalidate } from '../../../core/http/http-context.tokens';
import { Member, CreateMemberRequest, UpdateMemberRequest } from './member.model';
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

  /** `GET /Dashboard/getAllMembers` — bare array, no pagination envelope. */
  getAll(): Observable<Member[]> {
    return this.api.getList<Member>('Dashboard/getAllMembers', { context: withCache() });
  }

  /** `POST /Dashboard/addMember`, multipart. */
  create(payload: CreateMemberRequest): Observable<Member> {
    return this.api.post<Member>('Dashboard/addMember', toFormData(payload), {
      context: withCacheInvalidate(MEMBERS_CACHE_PATTERN),
    });
  }

  /** `PUT /Dashboard/updateMember`, multipart. */
  update(payload: UpdateMemberRequest): Observable<void> {
    return this.api.put<void>('Dashboard/updateMember', toFormData(payload), {
      context: withCacheInvalidate(MEMBERS_CACHE_PATTERN),
    });
  }

  /** `DELETE /Dashboard/deleteMember?id=` — confirmed query param. */
  delete(id: number): Observable<void> {
    return this.api.delete<void>('Dashboard/deleteMember', {
      params: { id },
      context: withCacheInvalidate(MEMBERS_CACHE_PATTERN),
    });
  }
}
