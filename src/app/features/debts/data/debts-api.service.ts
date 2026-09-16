import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PagedResponse } from '../../../core/models/api-response.model';
import { withSkipLoader } from '../../../core/http/http-context.tokens';
import { fetchAllPages } from '../../../core/utils/api-list.util';
import {
  CreateDebtPaymentRequest,
  CreateDebtPaymentResponse,
  CreateDebtRequest,
  Debt,
  DebtPayment,
  DebtsQuery,
} from './debt.model';

/**
 * "مديونات أخرى" (other debts) — verified directly against the live
 * backend (2026-09-16). Deliberately NOT cached through `HttpCacheService`:
 * a filter-driven report view (villaNumber changes per request), same
 * reasoning as `BondsApiService`.
 */
@Injectable({ providedIn: 'root' })
export class DebtsApiService {
  private readonly api = inject(ApiService);

  /** `GET /Dashboard/debts?villaNumber=&page=&pageSize=`. `withSkipLoader()` — see `BondsApiService.list()` for the same rationale. */
  list(query: DebtsQuery): Observable<PagedResponse<Debt>> {
    return this.api.getPaged<Debt>('Dashboard/debts', query, { context: withSkipLoader() });
  }

  /** `GET /Dashboard/debtPayments?villaNumber=&page=&pageSize=`. */
  listPayments(query: DebtsQuery): Observable<PagedResponse<DebtPayment>> {
    return this.api.getPaged<DebtPayment>('Dashboard/debtPayments', query, { context: withSkipLoader() });
  }

  /**
   * `POST /Dashboard/createDebt`. `withSkipLoader()` — the modal's own
   * submit button already shows a `[loading]` spinner; the full-page
   * overlay is reserved for GET requests, not per-action mutations.
   */
  create(payload: CreateDebtRequest): Observable<string> {
    return this.api.post<string>('Dashboard/createDebt', payload, {
      responseType: 'text',
      context: withSkipLoader(),
    });
  }

  /** `POST /Dashboard/debtPayment` — returns the updated running totals for the villa, not just a plain confirmation. */
  createPayment(payload: CreateDebtPaymentRequest): Observable<CreateDebtPaymentResponse> {
    return this.api.post<CreateDebtPaymentResponse>('Dashboard/debtPayment', payload, {
      context: withSkipLoader(),
    });
  }

  /**
   * No endpoint returns "outstanding balance for villa X" directly
   * (confirmed 2026-09-16) — computed client-side as
   * `sum(debts.amount) - sum(debtPayments.amount)` for the villa, draining
   * every page of both lists first. Used to show the balance live in the
   * "Add Payment" modal before the user submits.
   */
  getOutstandingBalance(villaNumber: string): Observable<number> {
    const debts$ = fetchAllPages((page, pageSize) => this.list({ villaNumber, page, pageSize }));
    const payments$ = fetchAllPages((page, pageSize) => this.listPayments({ villaNumber, page, pageSize }));

    return forkJoin([debts$, payments$]).pipe(
      map(([debts, payments]) => {
        const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        return totalDebt - totalPaid;
      }),
    );
  }
}
