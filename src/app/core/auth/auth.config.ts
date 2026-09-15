/**
 * Auth endpoint configuration. `logoutOwner` was confirmed directly against
 * the live backend (2026-09-15) — not present in the original Flutter-source
 * spec, which found no server-side logout call at all. There is still no
 * register/refresh/me endpoint on this backend — do not add one back in
 * without a confirmed API contract (spec §10 issue 2: there is no
 * refresh-token flow on this backend at all).
 */
export const AUTH_ENDPOINTS = {
  login: 'Dashboard/loginOwner',
  logout: 'Dashboard/logoutOwner',
  forgotPassword: 'Dashboard/forgotpasswordOwner',
  resetPassword: 'Dashboard/resetpasswordOwner',
} as const;

/**
 * Default route after login. The Flutter app's real de-facto landing screen
 * is "All Owners" (villa/apartment residents — the "Member" concept here,
 * spec §6.3) — not a dedicated dashboard.
 */
export const DEFAULT_AUTHENTICATED_ROUTE = '/members';

export const LOGIN_ROUTE = '/auth/login';
