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
  /**
   * True for a maintenance-difference payment (`debtPayment`) that the
   * backend now surfaces as a `Receipt` bond (2026-11-24). Its description is
   * "سداد فروق صيانة[ - notes]" and currency "EGP".
   */
  isMaintenanceDifference?: boolean;
  /** Maintenance-difference payments only: amount owed before this payment. `null` on regular bonds. */
  dueAmount?: number | null;
  /**
   * Maintenance-difference payments: amount paid in this payment. `null` on
   * regular bonds. (The maintenance-differences screen also reads this on
   * `Disbursement` rows as a running total, pending backend support.)
   */
  paidAmount?: number | null;
  /** Maintenance-difference payments: amount still owed after this payment. `null` on regular bonds. */
  remainingAmount?: number | null;
}

/**
 * `GET /Dashboard/GetBondsSummaryByYearByVillaNumber?villaNumber=` — bare
 * array, one item per year. Since 2026-11-24 `totalReceipt` and `difference`
 * include maintenance-difference payments; `maintenanceDifferencePayments`
 * is the part of `totalReceipt` that came from them.
 */
export interface BondsYearSummary {
  year: number;
  totalReceipt: number;
  totalDisbursement: number;
  difference: number;
  maintenanceDifferencePayments?: number | null;
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
  /** Omitted = all; `true` = maintenance-difference payments only; `false` = regular bonds only. */
  isMaintenanceDifference?: boolean;
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
