/**
 * "Member" = a villa/apartment resident (owner or tenant) — the actual
 * "الملاك" concept, distinct from the "Owner" backend URLs which are the
 * dashboard's own Admin/Account Manager users (see system-users feature).
 * Verified directly against the live backend's real request/response
 * shapes (2026-09-15) — `getAllMembers` returns a bare array, no pagination.
 */
export interface Member {
  id: number;
  email: string;
  userName: string;
  phoneNumber: string;
  /** Relative path (e.g. `/Images/Members/...png`) — resolve with `resolveMemberAvatarUrl()`, never render directly. */
  pictureUrl: string | null;
  villaAddress: string;
  /** Alphanumeric in practice (e.g. "12C", "d33") — always a string, never parse as a number. */
  villaNumber: string;
  villaLocation: string;
  villaSpace: string;
  villaStreet: string;
  memberType: MemberType | '';
  villaType: VillaType | '';
}

/** Fixed set, confirmed with the user (2026-09-15) — a dropdown, not free text. */
export type MemberType = 'مالك' | 'مستأجر' | 'مفوض';

/** Fixed set, confirmed with the user (2026-09-15) — a dropdown, not free text. */
export type VillaType = 'مشطبة' | 'غير مشطبة';

/** `POST /Dashboard/addMember`, multipart — verified against the live Swagger contract. */
export interface CreateMemberRequest {
  Name: string;
  Email: string;
  Password: string;
  PhoneNumber: string;
  Image?: File | null;
  VillaAddress: string;
  VillaLocation: string;
  VillaNumber: string;
  VillaSpace: string;
  VillaStreet?: string;
  MemberType: MemberType;
  VillaType: VillaType;
  DeviceToken?: string;
}

/**
 * `PUT /Dashboard/updateMember`, multipart — verified against the live Swagger contract. All fields but Id are optional ("Send empty value" in Swagger).
 * No longer carries a password — that moved to its own `updateMemberPassword`
 * endpoint (confirmed 2026-09-16); do not re-add a `Password` field here.
 */
export interface UpdateMemberRequest {
  Id: number;
  Email?: string;
  Name?: string;
  PhoneNumber?: string;
  Image?: File | null;
  VillaAddress?: string;
  VillaNumber?: string;
  VillaLocation?: string;
  VillaSpace?: string;
  VillaStreet?: string;
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
