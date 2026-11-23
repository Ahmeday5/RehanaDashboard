import { Bond } from './bond.model';

export type SettlementStatus = 'paid' | 'partial' | 'unpaid';

/**
 * How much of a maintenance-difference disbursement has been settled.
 * Pure view model derived from a `Bond` — never sent back to the API.
 */
export interface BondSettlement {
  total: number;
  paid: number;
  remaining: number;
  status: SettlementStatus;
  /** Arabic display label for `status`. */
  statusLabel: string;
  /** 0–100, clamped — safe to bind straight to a progress bar width. */
  progressPercent: number;
}

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  paid: 'مسدد بالكامل',
  partial: 'مسدد جزئياً',
  unpaid: 'غير مسدد',
};

/** Guards against floating-point dust (e.g. 0.0000001) flipping a fully-paid row to "partial". */
const EPSILON = 0.005;

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Derives the settlement breakdown for a disbursement bond.
 *
 * Tolerant of a partially-rolled-out backend: if only one of
 * `paidAmount`/`remainingAmount` is present the other is inferred from
 * `amount`. Returns `null` when neither is present (backend not wired yet),
 * so the UI renders a neutral placeholder instead of a misleading "0 paid".
 */
export function toBondSettlement(bond: Pick<Bond, 'amount' | 'paidAmount' | 'remainingAmount'>): BondSettlement | null {
  const total = bond.amount;
  const hasPaid = isNumber(bond.paidAmount);
  const hasRemaining = isNumber(bond.remainingAmount);
  if (!hasPaid && !hasRemaining) return null;

  const paid = hasPaid ? bond.paidAmount! : total - bond.remainingAmount!;
  const remaining = hasRemaining ? bond.remainingAmount! : total - paid;

  const status: SettlementStatus =
    remaining <= EPSILON ? 'paid' : paid <= EPSILON ? 'unpaid' : 'partial';

  const progressPercent = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : status === 'paid' ? 100 : 0;

  return { total, paid, remaining, status, statusLabel: SETTLEMENT_STATUS_LABELS[status], progressPercent };
}
