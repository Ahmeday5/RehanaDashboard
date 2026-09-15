/**
 * Rehana's REST backend has no role catalog beyond whatever string comes
 * back from `loginOwner` — see spec §6.4. Kept as a plain string (not a
 * union) because it's read only as a login heuristic, never for menu
 * gating today.
 */
export type UserRole = string;

/** Local, normalized session shape used everywhere inside the app. */
export interface User {
  email: string;
  userName: string;
  fullName: string | null;
  phoneNumber: string | null;
  roles: string[];
}

// ─────────── Wire shapes — verified against endpoint.dart / auth_repo_imp.dart ───────────

export interface LoginRequest {
  email: string;
  password: string;
  /** Hardcoded `true` in the Flutter source (auth_repo_imp.dart:28-36) — kept for parity. */
  rememberMe: true;
  /** FCM token fetched at login, or '' when messaging isn't supported (spec §3.1/§4). */
  deviceToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

/**
 * `POST /Dashboard/loginOwner` response body (spec §3.1) — a raw JSON
 * object, not wrapped in `{data: ...}`.
 */
export interface LoginResponseData {
  email: string;
  userName: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  roles: string[];
  /** Single opaque bearer token — no expiry claim, no refresh token issued. */
  token: string;
}
