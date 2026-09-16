import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BondsApiService } from './bonds-api.service';
import { BondRow, MemberReceiptRequest, toBondRow } from './bond.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

export interface MaintenancePaymentsFilters {
  villaNumber: string;
  memberName: string;
  fromDate: string;
  toDate: string;
}

const EMPTY_FILTERS: MaintenancePaymentsFilters = {
  villaNumber: '',
  memberName: '',
  fromDate: '',
  toDate: '',
};

/**
 * "مدفوعات فروق الصيانة" (maintenance-difference payments) — `Receipt`-type
 * bonds. A separate screen and a separate service from
 * `MaintenanceDifferencesService` (confirmed 2026-09-16) even though both
 * wrap the same `GET /Dashboard/bonds` endpoint — their filter state,
 * pagination, and add-flow are independent.
 */
@Injectable({ providedIn: 'root' })
export class MaintenancePaymentsService {
  private readonly api = inject(BondsApiService);

  private readonly stateSignal = signal<RequestState<BondRow>>(initialRequestState<BondRow>());
  readonly state = this.stateSignal.asReadonly();

  private readonly filtersSignal = signal<MaintenancePaymentsFilters>(EMPTY_FILTERS);
  readonly filters = this.filtersSignal.asReadonly();

  private readonly isSubmittingSignal = signal(false);
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();

  setFilters(filters: MaintenancePaymentsFilters): void {
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
          type: 'Receipt',
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
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل مدفوعات فروق الصيانة'),
      }));
    }
  }

  async createPayment(payload: MemberReceiptRequest): Promise<void> {
    this.isSubmittingSignal.set(true);
    try {
      await firstValueFrom(this.api.memberReceipt(payload));
      await this.load(1);
    } finally {
      this.isSubmittingSignal.set(false);
    }
  }
}
