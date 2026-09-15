/**
 * Auth endpoint configuration, verified against `endpoint.dart` (spec §3.1).
 * There is no register/refresh/me endpoint on this backend — do not add
 * one back in without a confirmed API contract (spec §10 issue 2: there is
 * no refresh-token flow on this backend at all).
 */
export const AUTH_ENDPOINTS = {
  login: 'Dashboard/loginOwner',
  forgotPassword: 'Dashboard/forgotpasswordOwner',
  resetPassword: 'Dashboard/resetpasswordOwner',
} as const;

/**
 * Default route after login. The Flutter app's real de-facto landing screen
 * is "All Owners" (spec §6.3) — not a dedicated dashboard — so this rebuild
 * makes that an explicit, intentional redirect instead of an implicit
 * side effect of state initialization order.
 */
export const DEFAULT_AUTHENTICATED_ROUTE = '/owners';

export const LOGIN_ROUTE = '/auth/login';
