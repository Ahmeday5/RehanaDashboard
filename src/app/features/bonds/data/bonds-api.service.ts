import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PagedResponse } from '../../../core/models/api-response.model';
import { withSkipLoader } from '../../../core/http/http-context.tokens';
import { Bond, BondsQuery, BulkDisbursementRequest, BulkDisbursementResponse, MemberReceiptRequest } from './bond.model';

/**
 * Bonds (سندات) — verified directly against the live backend (2026-09-16).
 * Deliberately NOT cached through `HttpCacheService`: this is a
 * filter-driven report view (villa/member/date range all change per
 * request), so every combination would be its own cache key with no real
 * reuse — always fetch fresh instead, same as the chat feature's live
 * streams skip caching for the analogous reason.
 */
@Injectable({ providedIn: 'root' })
export class BondsApiService {
  private readonly api = inject(ApiService);

  /**
   * `GET /Dashboard/bonds?type=&villaNumber=&memberName=&fromDate=&toDate=&page=&pageSize=`.
   * `withSkipLoader()` — every filter change, search keystroke, or page
   * turn refetches this; the list page shows its own first-load skeleton
   * and an in-table `[refreshing]` indicator afterwards instead of freezing
   * the whole screen on every filter tweak (confirmed 2026-09-16).
   */
  list(query: BondsQuery): Observable<PagedResponse<Bond>> {
    return this.api.getPaged<Bond>('Dashboard/bonds', query, { context: withSkipLoader() });
  }

  /**
   * `POST /Dashboard/bulkDisbursement` — creates one maintenance-difference
   * disbursement bond per villa in the request. `withSkipLoader()` — the
   * modal's own submit button already shows a `[loading]` spinner; the
   * full-page overlay is reserved for GET requests, not per-action
   * mutations (confirmed 2026-09-16).
   */
  bulkDisbursement(payload: BulkDisbursementRequest): Observable<BulkDisbursementResponse> {
    return this.api.post<BulkDisbursementResponse>('Dashboard/bulkDisbursement', payload, {
      context: withSkipLoader(),
    });
  }

  /**
   * `POST /Dashboard/memberReceipt` — records a maintenance-difference
   * payment against a single villa. Returns a plain-text confirmation on
   * success, not JSON — same shape as every other "...Successfully" endpoint
   * on this backend, so `responseType: 'json'` would throw a `SyntaxError`
   * on an otherwise-successful 200 response.
   */
  memberReceipt(payload: MemberReceiptRequest): Observable<void> {
    return this.api.post<void>('Dashboard/memberReceipt', payload, {
      responseType: 'text',
      context: withSkipLoader(),
    });
  }
}
