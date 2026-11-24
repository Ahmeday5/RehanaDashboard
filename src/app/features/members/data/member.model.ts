/**
 * "Member" = a villa/apartment resident (owner or tenant) — the actual
 * "الملاك" concept, distinct from the "Owner" backend URLs which are the
 * dashboard's own Admin/Account Manager users (see system-users feature).
 * Verified directly against the live backend's real request/response
 * shapes (2026-09-15).
 * 2026-11-24: `email`, `villaStreet` and `villaLocation` were removed from
 * the API entirely (not accepted, not returned) — do not re-add them.
 */
export interface Member {
  id: number;
  userName: string;
  phoneNumber: string;
  /** Relative path (e.g. `/Images/Members/...png`) — resolve with `resolveMemberAvatarUrl()`, never render directly. */
  pictureUrl: string | null;
  /** Optional (2026-11-24) — may come back `null`; render as "-". */
  villaAddress: string | null;
  /** Alphanumeric in practice (e.g. "12C", "d33") — always a string, never parse as a number. */
  villaNumber: string;
  villaSpace: string;
  memberType: MemberType | '';
  villaType: VillaType | '';
  deviceToken?: string | null;
}

/** Fixed set, confirmed with the user (2026-09-15) — a dropdown, not free text. */
export type MemberType = 'مالك' | 'مستأجر' | 'مفوض';

/** Fixed set, confirmed with the user (2026-09-15) — a dropdown, not free text. */
export type VillaType = 'مشطبة' | 'غير مشطبة';

/**
 * `POST /Dashboard/addMember`, multipart.
 * 2026-11-23: `Email`, `VillaLocation` and `VillaStreet` were dropped from
 * the add flow (backend is removing them / making them nullable) — do NOT
 * re-add them here. `VillaAddress` is optional and omitted when blank.
 */
export interface CreateMemberRequest {
  Name: string;
  Password: string;
  PhoneNumber: string;
  Image?: File | null;
  VillaAddress?: string;
  VillaNumber: string;
  VillaSpace: string;
  MemberType: MemberType;
  VillaType: VillaType;
  DeviceToken?: string;
}

/**
 * `PUT /Dashboard/updateMember`, multipart — verified against the live Swagger contract. All fields but Id are optional ("Send empty value" in Swagger).
 * No longer carries a password — that moved to its own `updateMemberPassword`
 * endpoint (confirmed 2026-09-16); do not re-add a `Password` field here.
 * 2026-11-23: mirrors `CreateMemberRequest` — `Email`, `VillaLocation` and
 * `VillaStreet` dropped; `VillaAddress` optional and omitted when blank.
 */
export interface UpdateMemberRequest {
  Id: number;
  Name?: string;
  PhoneNumber?: string;
  Image?: File | null;
  VillaAddress?: string;
  VillaNumber?: string;
  VillaSpace?: string;
  MemberType?: MemberType;
  VillaType?: VillaType;
}

/** `PUT /Dashboard/updateMemberPassword`, JSON body — confirmed 2026-09-16, separate from the general update endpoint. */
export interface UpdateMemberPasswordRequest {
  memberId: number;
  newPassword: string;
}

/**
 * `GET /Dashboard/memberFamilyDependants/{memberId}` — bare array, confirmed
 * 2026-09-16. A dependant's `pictureUrl` is already an absolute URL in the
 * live response (unlike `Member.pictureUrl`) — render it as-is, do not run
 * it through `resolveMemberAvatarUrl()`.
 */
export interface FamilyDependant {
  id: number;
  fullName: string;
  phoneNumber: string;
  pictureUrl: string | null;
  dependantType: string;
  memberId: number;
}
