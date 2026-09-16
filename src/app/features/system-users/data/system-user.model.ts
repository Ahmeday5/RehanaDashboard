/**
 * "System user" = an Admin or Account Manager who operates this dashboard
 * itself — NOT a villa/apartment resident. Confirmed directly against the
 * live backend's real request/response shapes (2026-09-15), which differ
 * from what the original spec (§3.3) had documented from the Flutter
 * source alone: `getAllOwners` returns no pagination envelope (a bare
 * array), and real `updateOwner` / `deleteOwner/{id}` endpoints exist,
 * where the spec's Flutter-derived research found none. Always prefer a
 * confirmed live-backend contract over the ported spec when they conflict.
 *
 * Residents (villa/apartment owners) are a separate "Member" concept with
 * its own endpoint, deliberately not built yet — do not conflate the two.
 */
export type SystemUserRole = 'Admin' | 'Account Manager';

export interface SystemUser {
  id: string;
  email: string;
  userName: string;
  fullName: string | null;
  phoneNumber: string | null;
  roles: SystemUserRole[];
}

/** `POST /Dashboard/addOwner` request body — verified against the live backend. */
export interface CreateSystemUserRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  roles: SystemUserRole[];
  /** Always sent empty from the dashboard — device push tokens are a mobile-app concept. */
  deviceToken: string;
}

/**
 * `PUT /Dashboard/updateOwner?id={id}` request body — verified against the
 * live backend for the body shape; the id is NOT in the body. The backend
 * team hasn't finished wiring the id-to-target mapping for this endpoint
 * yet (as of 2026-09-15) — sending it as a query param is our agreed
 * placeholder convention, matching `deleteOwner`'s path-param style closely
 * enough that no client change should be needed once the backend lands.
 * No longer carries a password — that moved to its own `updateOwnerPassword`
 * endpoint (confirmed 2026-09-16), mirroring Members/Security Guards.
 */
export interface UpdateSystemUserRequest {
  email: string;
  fullName: string;
  phoneNumber: string;
  roles: SystemUserRole[];
}

/** `PUT /Dashboard/updateOwnerPassword`, JSON body — confirmed 2026-09-16, separate from the general update endpoint. */
export interface UpdateSystemUserPasswordRequest {
  ownerId: string;
  newPassword: string;
}
