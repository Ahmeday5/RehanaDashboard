import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DebtsApiService } from './debts-api.service';
import { CreateDebtRequest, Debt } from './debt.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

export interface DebtsFilters {
  villaNumber: string;
}

const EMPTY_FILTERS: DebtsFilters = { villaNumber: '' };

/**
 * "مديونات أخرى" list screen — `Debt` records, unrelated to maintenance
 * bonds (confirmed 2026-09-16). One signal-based service per spec §1.3
 * pattern; not cached (see `DebtsApiService`) since this is a live filtered
 * report, not a stable list.
 */
@Injectable({ providedIn: 'root' })
export class DebtsService {
  private readonly api = inject(DebtsApiService);

  private readonly stateSignal = signal<RequestState<Debt>>(initialRequestState<Debt>());
  readonly state = this.stateSignal.asReadonly();

  private readonly filtersSignal = signal<DebtsFilters>(EMPTY_FILTERS);
  readonly filters = this.filtersSignal.asReadonly();

  private readonly isSubmittingSignal = signal(false);
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();

  setFilters(filters: DebtsFilters): void {
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
    } catch (err) {
      this.stateSignal.update((s) => ({
        ...s,
        status: 'error',
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل المديونيات'),
      }));
    }
  }

  /** New debts always land at the end of the list — return to page 1 so the confirmation is visible without hunting for it. */
  async create(payload: CreateDebtRequest): Promise<void> {
    this.isSubmittingSignal.set(true);
    try {
      await firstValueFrom(this.api.create(payload));
      await this.load(1);
    } finally {
      this.isSubmittingSignal.set(false);
    }
  }
}
