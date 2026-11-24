/**
 * "مديونات أخرى" (other debts) — a separate accounting domain from bonds/
 * maintenance differences (confirmed 2026-09-16): a manually-recorded debt
 * against a villa, unrelated to maintenance. Two independent record types
 * (`Debt` and `DebtPayment`), each with its own list/create endpoint — no
 * shared `type` discriminator the way bonds has.
 */

/** `GET /Dashboard/debts` row shape — confirmed 2026-09-16. Has a real `id`, unlike `Bond`. */
export interface Debt {
  id: number;
  villaNumber: string;
  memberName: string;
  amount: number;
  notes: string;
  createdAt: string;
}

/**
 * `GET /Dashboard/debtPayments` row shape. The running-balance fields were
 * added 2026-11-24. The list is ordered newest-first, so when filtered by
 * `villaNumber` the first item on page 1 carries the villa's final balance.
 */
export interface DebtPayment {
  id: number;
  villaNumber: string;
  memberName: string;
  /** This payment's own amount. */
  amount: number;
  notes: string;
  date: string;
  /** Total amount owed by the villa. */
  totalDebt: number;
  /** Cumulative amount paid up to and including this payment. */
  totalPaid: number;
  /** Amount still owed by the villa after this payment. */
  remainingAmount: number;
}

/** Query params shared by `GET /Dashboard/debts` and `GET /Dashboard/debtPayments` — only `villaNumber` filter confirmed. */
export interface DebtsQuery {
  [key: string]: unknown;
  villaNumber?: string;
  page: number;
  pageSize: number;
}

/** `POST /Dashboard/createDebt` — confirmed 2026-09-16. */
export interface CreateDebtRequest {
  villaNumber: string;
  amount: number;
  notes: string;
}

/**
 * `POST /Dashboard/debtPayment` — confirmed 2026-09-16. Paying more than
 * the outstanding balance is allowed by the backend and produces a negative
 * `totalOutstanding` (credit in the resident's favor) — do not clamp or
 * validate the amount against the balance client-side.
 */
export interface CreateDebtPaymentRequest {
  villaNumber: string;
  amount: number;
  notes: string;
}

export interface CreateDebtPaymentResponse {
  message: string;
  paymentAmount: number;
  totalDebt: number;
  totalPaid: number;
  totalOutstanding: number;
}
