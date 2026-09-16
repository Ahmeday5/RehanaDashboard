/**
 * `GET /Dashboard/list` — every villa with its current member, used to
 * populate villa-picker dropdowns (confirmed 2026-09-16). Supports a
 * `villaNumber` query param for server-side search-as-you-type.
 */
export interface VillaDirectoryEntry {
  villaNumber: string;
  memberName: string;
}
