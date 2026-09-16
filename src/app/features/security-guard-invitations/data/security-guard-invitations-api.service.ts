import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PagedResponse } from '../../../core/models/api-response.model';
import { withSkipLoader } from '../../../core/http/http-context.tokens';
import { SecurityGuardInvitation, SecurityGuardInvitationsQuery } from './security-guard-invitation.model';

/**
 * `GET /Dashboard/securityGuardInvitations` — confirmed 2026-09-16.
 * Deliberately NOT cached: a filter-driven report view (guard/status/date
 * range all change per request), same reasoning as `BondsApiService`/`DebtsApiService`.
 */
@Injectable({ providedIn: 'root' })
export class SecurityGuardInvitationsApiService {
  private readonly api = inject(ApiService);

  /** `withSkipLoader()` — every filter change or page turn refetches this; the list page shows its own in-table `[refreshing]` indicator instead of freezing the whole screen. */
  list(query: SecurityGuardInvitationsQuery): Observable<PagedResponse<SecurityGuardInvitation>> {
    return this.api.getPaged<SecurityGuardInvitation>('Dashboard/securityGuardInvitations', query, {
      context: withSkipLoader(),
    });
  }
}
