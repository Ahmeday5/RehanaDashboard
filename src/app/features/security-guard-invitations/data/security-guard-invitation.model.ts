/**
 * "دعوات حراس الأمن" (security guard invitations) — a visitor invitation a
 * guard created for a villa, confirmed 2026-09-16. Has a real UUID `id`,
 * unlike bonds. `status` values are the backend's own English strings —
 * displayed in Arabic, but the value sent/received is always English
 * (confirmed 2026-09-16: "الدروب داون بالعربي وهتبعت الانجليزي").
 */
export type InvitationStatus = 'Active' | 'Expired';

/** `GET /Dashboard/securityGuardInvitations` row shape — confirmed 2026-09-16. */
export interface SecurityGuardInvitation {
  id: string;
  securityGuardId: number;
  securityGuardName: string;
  villaNumber: string;
  visitorName: string;
  carPlateNumber: string;
  visitTime: string;
  notes: string;
  /** `null` has been observed in the live response — do not assume every invitation resolves to a known member. */
  memberName: string | null;
  createdAt: string;
  status: InvitationStatus;
  /** `null` while still `Active` — only set once the invitation ends (expires or is used). */
  endedAt: string | null;
}

/** Query params for `GET /Dashboard/securityGuardInvitations` — all filters optional. */
export interface SecurityGuardInvitationsQuery {
  [key: string]: unknown;
  securityId?: number;
  status?: InvitationStatus;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}
