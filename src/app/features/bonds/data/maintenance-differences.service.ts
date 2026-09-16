import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BondsApiService } from './bonds-api.service';
import { BondRow, BulkDisbursementRequest, toBondRow } from './bond.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

export interface MaintenanceDifferencesFilters {
  villaNumber: string;
  memberName: string;
  fromDate: string;
  toDate: string;
}

const EMPTY_FILTERS: MaintenanceDifferencesFilters = {
  villaNumber: '',
  memberName: '',
  fromDate: '',
  toDate: '',
};

/**
 * "فروقات الصيانة" (maintenance differences) — `Disbursement`-type bonds.
 * One signal-based service per spec §1.3 pattern; not cached (see
 * `BondsApiService`) since this is a live filtered report, not a stable list.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceDifferencesService {
  private readonly api = inject(BondsApiService);

  private readonly stateSignal = signal<RequestState<BondRow>>(initialRequestState<BondRow>());
  readonly state = this.stateSignal.asReadonly();

  private readonly filtersSignal = signal<MaintenanceDifferencesFilters>(EMPTY_FILTERS);
  readonly filters = this.filtersSignal.asReadonly();

  private readonly isSubmittingSignal = signal(false);
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();

  setFilters(filters: MaintenanceDifferencesFilters): void {
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
          type: 'Disbursement',
          villaNumber: f.villaNumber || undefined,
          memberName: f.memberName || undefined,
          fromDate: f.fromDate || undefined,
          toDate: f.toDate || undefined,
          page: targetPage,
          pageSize: targetPageSize,
        }),
      );
      this.stateSignal.update((s) => ({
        ...s,
        status: 'success',
        items: res.items.map(toBondRow),
        page: res.page,
        pageSize: res.pageSize,
        totalItems: res.totalItems,
        totalPages: res.totalPages,
      }));
    } catch (err) {
      this.stateSignal.update((s) => ({
        ...s,
        status: 'error',
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل فروقات الصيانة'),
      }));
    }
  }

  /** Returns the backend's confirmation message + total so the caller can toast it verbatim. */
  async createBulk(payload: BulkDisbursementRequest): Promise<{ message: string; totalAmount: number }> {
    this.isSubmittingSignal.set(true);
    try {
      const res = await firstValueFrom(this.api.bulkDisbursement(payload));
      await this.load(1);
      return { message: res.message, totalAmount: res.totalAmount };
    } finally {
      this.isSubmittingSignal.set(false);
    }
  }
}
