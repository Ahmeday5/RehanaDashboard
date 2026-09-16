import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { withCache, withSkipLoader } from '../http/http-context.tokens';
import { VillaDirectoryEntry } from '../../shared/data/villa-directory.model';

/**
 * `GET /Dashboard/list` — every villa + its current member, the single
 * source used by every villa-picker dropdown in the app (bulk disbursement,
 * member receipts, ...). Not feature-specific, hence living in `core`
 * alongside the other cross-feature services (confirmed 2026-09-16).
 */
@Injectable({ providedIn: 'root' })
export class VillaDirectoryService {
  private readonly api = inject(ApiService);

  /**
   * `villaNumber` is an optional server-side search filter (substring match
   * on the backend) — pass the user's live dropdown query to it directly
   * rather than filtering the full list client-side.
   * `withSkipLoader()` — opening a dropdown (or typing in it) must never
   * freeze the whole screen with the full-page overlay; the dropdown itself
   * shows its own inline loading state (confirmed 2026-09-16 — the same
   * scoping rule already applied to list-page filters/pagination).
   */
  search(villaNumber?: string): Observable<VillaDirectoryEntry[]> {
    return this.api.getList<VillaDirectoryEntry>('Dashboard/list', {
      params: villaNumber ? { villaNumber } : undefined,
      context: withSkipLoader(withCache({ ttlMs: 60_000 })),
    });
  }
}
