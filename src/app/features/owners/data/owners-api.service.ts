import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheInvalidate } from '../../../core/http/http-context.tokens';
import { Owner, CreateOwnerRequest, UpdateOwnerRequest } from './owner.model';

/** Raw wire shape from `getAllOwners`/`getAllMembers` — `villaNumber` arrives as a string (spec §3.2). */
interface OwnerWire {
  id: number;
  email: string;
  userName: string;
  phoneNumber: string;
  villaAddress: string;
  villaLocation: string;
  villaNumber: string;
  villaSpace: string;
  villaStreet: string;
  villaFloorsNumber: number;
  pictureUrl: string | null;
}

/**
 * Owner avatar base — hardcoded in the Flutter source as the API base URL
 * MINUS `/api` (spec §3.2/§10 issue 12), not derived from any shared
 * constant there. Kept as an explicit, named constant here (rather than
 * silently re-deriving it from `environment.apiUrl`) so a future fix is a
 * one-line change once confirmed with backend which convention is correct.
 */
const OWNER_AVATAR_BASE = 'http://78.89.159.126:9393/TheOneAPIRehana';

/** Resolves an owner's `pictureUrl` into a displayable URL — spec §3.2's owner-avatar convention. */
export function resolveOwnerAvatarUrl(pictureUrl: string | null): string | null {
  if (!pictureUrl) return null;
  if (pictureUrl.startsWith('http')) return pictureUrl;
  return `${OWNER_AVATAR_BASE}${pictureUrl}`;
}

function toOwner(wire: OwnerWire): Owner {
  return {
    id: wire.id,
    email: wire.email,
    userName: wire.userName,
    phoneNumber: wire.phoneNumber,
    villaAddress: wire.villaAddress,
    villaLocation: wire.villaLocation,
    villaNumber: Number(wire.villaNumber),
    villaSpace: wire.villaSpace,
    villaStreet: wire.villaStreet,
    villaFloorsNumber: wire.villaFloorsNumber,
    pictureUrl: wire.pictureUrl,
  };
}

function toFormData(payload: Record<string, unknown>): FormData {
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

/** Cache-invalidation pattern shared by every owners-list-changing mutation. */
const OWNERS_CACHE_PATTERN = ['getAllOwners'];

@Injectable({ providedIn: 'root' })
export class OwnersApiService {
  private readonly api = inject(ApiService);

  /** `GET /Dashboard/getAllOwners` (spec §3.2) — bare array, no pagination envelope. */
  getAllOwners(): Observable<Owner[]> {
    return this.api
      .getList<OwnerWire>('Dashboard/getAllOwners', { context: withCache() })
      .pipe(map((rows) => rows.map(toOwner)));
  }

  /** `POST /Dashboard/addMember`, multipart (spec §3.2). */
  create(payload: CreateOwnerRequest): Observable<Owner> {
    const { VillaNumber, VillaSpace, image, ...rest } = payload;
    const form = toFormData({ ...rest, VillaNumber, VillaSpace, Image: image });
    return this.api
      .post<OwnerWire>('Dashboard/addMember', form, {
        context: withCacheInvalidate(OWNERS_CACHE_PATTERN),
      })
      .pipe(map(toOwner));
  }

  /** `PUT /Dashboard/updateMember`, multipart (spec §3.2). */
  update(payload: UpdateOwnerRequest): Observable<void> {
    const { Image, ...rest } = payload;
    const form = toFormData({ ...rest, Image });
    return this.api.put<void>('Dashboard/updateMember', form, {
      context: withCacheInvalidate(OWNERS_CACHE_PATTERN),
    });
  }

  /** `DELETE /Dashboard/deleteMember?id=` (spec §3.2). */
  delete(id: number): Observable<void> {
    return this.api.delete<void>('Dashboard/deleteMember', {
      params: { id },
      context: withCacheInvalidate(OWNERS_CACHE_PATTERN),
    });
  }
}
