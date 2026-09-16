/**
 * `GET /Dashboard/statistics` — the compound-wide overview shown on the
 * dashboard home screen, the first page the app opens to (confirmed
 * 2026-09-16). A flat snapshot object, no pagination/filtering.
 */
export interface DashboardStatistics {
  totalMembers: number;
  totalSecurityGuards: number;
  totalOwners: number;
  upcomingInvitations: number;
  completedInvitations: number;
  canceledInvitations: number;
  totalReceipts: number;
  totalDisbursements: number;
  totalDebts: number;
  totalDebtPayments: number;
  /** Can be negative — a compound-wide credit position, mirrors the per-villa `totalOutstanding` sign convention from `debtPayment`. */
  totalOutstandingDebts: number;
  activeVisitorInvitations: number;
  expiredVisitorInvitations: number;
}
