import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DebtsApiService } from './debts-api.service';
import { CreateDebtPaymentRequest, CreateDebtPaymentResponse, DebtPayment } from './debt.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

export interface DebtPaymentsFilters {
  villaNumber: string;
}

const EMPTY_FILTERS: DebtPaymentsFilters = { villaNumber: '' };

/** Final balance for the filtered villa — taken from the newest payment (first item on page 1). */
export interface VillaPaymentsSummary {
  villaNumber: string;
  totalDebt: number;
  totalPaid: number;
  remainingAmount: number;
}

/**
 * "مدفوعات المديونيات" — `DebtPayment` records. A separate screen and a
 * separate service from `DebtsService` (confirmed 2026-09-16, mirroring the
 * maintenance-differences/payments split) even though both concern the same
 * villa's balance.
 */
@Injectable({ providedIn: 'root' })
export class DebtPaymentsService {
  private readonly api = inject(DebtsApiService);

  private readonly stateSignal = signal<RequestState<DebtPayment>>(initialRequestState<DebtPayment>());
  readonly state = this.stateSignal.asReadonly();

  private readonly filtersSignal = signal<DebtPaymentsFilters>(EMPTY_FILTERS);
  readonly filters = this.filtersSignal.asReadonly();

  private readonly isSubmittingSignal = signal(false);
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();

  /**
   * `null` unless a villa filter is active and has results. Only refreshed
   * when page 1 loads (the list is newest-first, so page 1's first item holds
   * the villa's final balance) — paging further keeps the last value.
   */
  private readonly summarySignal = signal<VillaPaymentsSummary | null>(null);
  readonly summary = this.summarySignal.asReadonly();

  setFilters(filters: DebtPaymentsFilters): void {
    this.filtersSignal.set(filters);
    this.summarySignal.set(null);
    void this.load(1);
  }

  clearFilters(): void {
    this.filtersSignal.set(EMPTY_FILTERS);
    this.summarySignal.set(null);
    void this.load(1);
  }

  async load(page?: number, pageSize?: number): Promise<void> {
    const targetPage = page ?? this.stateSignal().page;
    const targetPageSize = pageSize ?? this.stateSignal().pageSize;
    const f = this.filtersSignal();

    this.stateSignal.update((s) => ({ ...s, status: 'loading', errorMessage: null }));
    try {
      const res = await firstValueFrom(
        this.api.listPayments({
          villaNumber: f.villaNumber || undefined,
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
      if (res.page === 1 || targetPage === 1) {
        const latest = f.villaNumber ? res.items[0] : undefined;
        this.summarySignal.set(
          latest
            ? {
                villaNumber: f.villaNumber,
                totalDebt: latest.totalDebt,
                totalPaid: latest.totalPaid,
                remainingAmount: latest.remainingAmount,
              }
            : null,
        );
      }
    } catch (err) {
      this.stateSignal.update((s) => ({
        ...s,
        status: 'error',
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل مدفوعات المديونيات'),
      }));
    }
  }

  /** Returns the backend's own running totals so the caller can toast/confirm the new balance verbatim. */
  async createPayment(payload: CreateDebtPaymentRequest): Promise<CreateDebtPaymentResponse> {
    this.isSubmittingSignal.set(true);
    try {
      const res = await firstValueFrom(this.api.createPayment(payload));
      await this.load(1);
      return res;
    } finally {
      this.isSubmittingSignal.set(false);
    }
  }
}
