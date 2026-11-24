import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
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
   * Current outstanding balance for a villa, shown live in the "Add Payment"
   * modal. Reads `remainingAmount` off the villa's latest payment (the list
   * is newest-first, so `page=1&pageSize=1` is enough). With no payments yet,
   * nothing has been paid, so the balance is the sum of the villa's debts.
   */
  getOutstandingBalance(villaNumber: string): Observable<number> {
    return this.listPayments({ villaNumber, page: 1, pageSize: 1 }).pipe(
      switchMap((res) => {
        const latest = res.items[0];
        if (latest) return of(latest.remainingAmount);
        return fetchAllPages((page, pageSize) => this.list({ villaNumber, page, pageSize })).pipe(
          map((debts) => debts.reduce((sum, d) => sum + d.amount, 0)),
        );
      }),
    );
  }
}
