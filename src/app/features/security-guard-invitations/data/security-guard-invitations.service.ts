import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SecurityGuardInvitationsApiService } from './security-guard-invitations-api.service';
import { InvitationStatus, SecurityGuardInvitation } from './security-guard-invitation.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

export interface SecurityGuardInvitationsFilters {
  securityId: number | null;
  status: InvitationStatus | null;
  fromDate: string;
  toDate: string;
}

const EMPTY_FILTERS: SecurityGuardInvitationsFilters = {
  securityId: null,
  status: null,
  fromDate: '',
  toDate: '',
};

/**
 * "دعوات حراس الأمن" list screen — one signal-based service per spec §1.3
 * pattern; not cached (see `SecurityGuardInvitationsApiService`) since this
 * is a live filtered report, not a stable list.
 */
@Injectable({ providedIn: 'root' })
export class SecurityGuardInvitationsService {
  private readonly api = inject(SecurityGuardInvitationsApiService);

  private readonly stateSignal = signal<RequestState<SecurityGuardInvitation>>(
    initialRequestState<SecurityGuardInvitation>(),
  );
  readonly state = this.stateSignal.asReadonly();

  private readonly filtersSignal = signal<SecurityGuardInvitationsFilters>(EMPTY_FILTERS);
  readonly filters = this.filtersSignal.asReadonly();

  setFilters(filters: SecurityGuardInvitationsFilters): void {
    this.filtersSignal.set(filters);
    void this.load(1);
  }

  clearFilters(): void {
    this.filtersSignal.set(EMPTY_FILTERS);
    void this.load(1);
  }

  async load(page?: number, pageSize?: number): Promise<void> {
    const targetPage = page ?? this.stateSignal().page;
    const targetPageSize = pageSize ?? this.stateSignal().pageSize;
    const f = this.filtersSignal();

    this.stateSignal.update((s) => ({ ...s, status: 'loading', errorMessage: null }));
    try {
      const res = await firstValueFrom(
        this.api.list({
          securityId: f.securityId ?? undefined,
          status: f.status ?? undefined,
          fromDate: f.fromDate || undefined,
          toDate: f.toDate || undefined,
          page: targetPage,
          pageSize: targetPageSize,
        }),
      );
      this.stateSignal.update((s) => ({
        ...s,
        status: 'success',
        items: res.items,
        page: res.page,
        pageSize: res.pageSize,
        totalItems: res.totalItems,
        totalPages: res.totalPages,
      }));
    } catch (err) {
      this.stateSignal.update((s) => ({
        ...s,
        status: 'error',
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل دعوات حراس الأمن'),
      }));
    }
  }
}
