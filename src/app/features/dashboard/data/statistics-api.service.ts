import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { withCache, withCacheBypass, withSkipLoader } from '../../../core/http/http-context.tokens';
import { DashboardStatistics } from './statistics.model';

/**
 * `GET /Dashboard/statistics` — confirmed 2026-09-16. A short-TTL cache
 * (this is a live "as of now" snapshot, not a stable list) plus
 * `withSkipLoader()` since the home screen renders its own first-load
 * skeleton and hero entrance animation instead of the full-page overlay.
 * `forceRefresh` skips a fresh cache hit (manual refresh button) while
 * still re-populating the cache with whatever comes back.
 */
@Injectable({ providedIn: 'root' })
export class StatisticsApiService {
  private readonly api = inject(ApiService);

  get(forceRefresh = false): Observable<DashboardStatistics> {
    const context = withSkipLoader(forceRefresh ? withCacheBypass(withCache({ ttlMs: 30_000 })) : withCache({ ttlMs: 30_000 }));
    return this.api.get<DashboardStatistics>('Dashboard/statistics', { context });
  }
}
