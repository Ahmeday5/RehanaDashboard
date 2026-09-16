import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { withCache, withSkipLoader } from '../http/http-context.tokens';
import { fetchAllPages } from '../utils/api-list.util';
import { SecurityGuard } from '../../features/security-guards/data/security-guard.model';

/**
 * Full security-guard directory, drained across every page of
 * `GET /Dashboard/getAllSecurityGuards` in one call — used to populate the
 * guard-picker dropdown on the Security Guard Invitations screen (confirmed
 * 2026-09-16: "دروب داون من اندبوينت الجرد ... اعملي فور لوب عليها بحيث
 * انك تجيب كل الجرد مرة واحدة", i.e. never cap it to one page — if guards
 * grow past a single page, the dropdown must still list all of them).
 * Not feature-specific in spirit, but the `SecurityGuard` type lives in the
 * security-guards feature, so this stays a thin core wrapper around it
 * rather than duplicating the model.
 */
@Injectable({ providedIn: 'root' })
export class SecurityGuardDirectoryService {
  private readonly api = inject(ApiService);

  /** `withSkipLoader()` — populating a dropdown must never freeze the whole screen. Cached briefly since the guard roster changes rarely. */
  getAll(): Observable<SecurityGuard[]> {
    return fetchAllPages((page, pageSize) =>
      this.api.getPaged<SecurityGuard>(
        'Dashboard/getAllSecurityGuards',
        { page, pageSize },
        { context: withSkipLoader(withCache({ ttlMs: 60_000 })) },
      ),
    );
  }
}
