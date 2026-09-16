/**
 * "Bond" (سند) — a generic accounting entry, either money OUT to a villa
 * (`Disbursement` — e.g. a maintenance-difference charge) or money IN from a
 * villa (`Receipt` — e.g. a maintenance-difference payment). Both share the
 * exact same `GET /Dashboard/bonds` list endpoint, distinguished only by the
 * `type` query param — confirmed 2026-09-16.
 */
export type BondType = 'Disbursement' | 'Receipt';

/** `GET /Dashboard/bonds` row shape — confirmed 2026-09-16. No `id` field at all; the backend doesn't expose one for bonds. */
export interface Bond {
  date: string;
  currency: string;
  bondDescription: string;
  type: BondType;
  amount: number;
  villaNumber: string;
  memberName: string;
}

/** A `Bond` plus a client-synthesized stable key for `@for`/`DataTableComponent` tracking, since the API returns no id. */
export interface BondRow extends Bond {
  _rowId: string;
}

export function toBondRow(bond: Bond, index: number): BondRow {
  return { ...bond, _rowId: `${bond.villaNumber}-${bond.date}-${bond.amount}-${index}` };
}

/** Query params for `GET /Dashboard/bonds` — all filters optional besides `type`. */
export interface BondsQuery {
  [key: string]: unknown;
  type: BondType;
  villaNumber?: string;
  memberName?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}

/**
 * `POST /Dashboard/bulkDisbursement` — creates one maintenance-difference
 * disbursement bond per villa in `villaNumbers` (confirmed 2026-09-16).
 */
export interface BulkDisbursementRequest {
  villaNumbers: string[];
  pricePerMeter: number;
  date: string;
  currency: string;
  bondDescription: string;
}

export interface BulkDisbursementResponse {
  message: string;
  totalAmount: number;
  notificationsSent: number;
}

/**
 * `POST /Dashboard/memberReceipt` — records a payment (receipt) against a
 * single villa's maintenance difference (confirmed 2026-09-16). Returns a
 * plain-text confirmation on success, not JSON — same shape as every other
 * "Updated/Deleted Successfully" endpoint on this backend.
 */
export interface MemberReceiptRequest {
  villaNumber: string;
  amount: number;
  date: string;
  currency: string;
  bondDescription: string;
}
