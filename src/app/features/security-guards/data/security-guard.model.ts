/**
 * "Security guard" — verified directly against the live backend's real
 * request/response shapes (2026-09-15). `pictureUrl` is used as-is with no
 * base-URL prepending, per spec §3.4 — the opposite convention from
 * Members' avatar handling; do not unify the two without confirming with
 * backend which is correct.
 */
export interface SecurityGuard {
  id: number;
  email: string;
  userName: string;
  phoneNumber: string;
  pictureUrl: string | null;
  gateNumber: string;
  deviceToken: string;
}

/** `POST /Dashboard/addSecurityGuard`, multipart — verified against the live Swagger contract. */
export interface CreateSecurityGuardRequest {
  UserName: string;
  Email: string;
  Password: string;
  PhoneNumber: string;
  Image?: File | null;
  GateNumber: string;
  DeviceToken?: string;
}

/**
 * `PUT /Dashboard/updateSecurityGuard`, multipart — verified against the live Swagger contract. All fields but Id are optional.
 * No longer carries a password — that moved to its own `updateSecurityGuardPassword`
 * endpoint (confirmed 2026-09-16), mirroring Members; do not re-add a `Password` field here.
 */
export interface UpdateSecurityGuardRequest {
  Id: number;
  UserName?: string;
  Email?: string;
  PhoneNumber?: string;
  Image?: File | null;
  GateNumber?: string;
}

/** `PUT /Dashboard/updateSecurityGuardPassword`, JSON body — confirmed 2026-09-16, separate from the general update endpoint. */
export interface UpdateSecurityGuardPasswordRequest {
  securityGuardId: number;
  newPassword: string;
}
