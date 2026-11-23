import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { BondsApiService } from './bonds-api.service';
import { BondEventsService } from './bond-events.service';
import { Bond, BondRow, BulkDisbursementRequest, toBondRow } from './bond.model';
import { BondSettlement, toBondSettlement } from './bond-settlement';
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

/** A disbursement row enriched with its settlement breakdown (`null` until the backend returns balances). */
export interface MaintenanceDifferenceRow extends BondRow {
  settlement: BondSettlement | null;
}

function toMaintenanceDifferenceRow(bond: Bond, index: number): MaintenanceDifferenceRow {
  return { ...toBondRow(bond, index), settlement: toBondSettlement(bond) };
}

/**
 * "فروقات الصيانة" (maintenance differences) — `Disbursement`-type bonds.
 * One signal-based service per spec §1.3 pattern; not cached (see
 * `BondsApiService`) since this is a live filtered report, not a stable list.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceDifferencesService {
  private readonly api = inject(BondsApiService);
  private readonly events = inject(BondEventsService);

  private readonly stateSignal = signal<RequestState<MaintenanceDifferenceRow>>(
    initialRequestState<MaintenanceDifferenceRow>(),
  );
  readonly state = this.stateSignal.asReadonly();

  private readonly filtersSignal = signal<MaintenanceDifferencesFilters>(EMPTY_FILTERS);
  readonly filters = this.filtersSignal.asReadonly();

  private readonly isSubmittingSignal = signal(false);
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();

  constructor() {
    // A payment recorded anywhere (e.g. the payments screen) changes the
    // paid/remaining balances shown here — refetch so they're never stale.
    this.events.receiptRecorded$
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.refreshIfLoaded());
  }

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
        items: res.items.map(toMaintenanceDifferenceRow),
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

  /**
   * Reloads the current page/filters in place — but only if this screen has
   * been opened at least once this session. Never-visited screens load
   * fresh on first open anyway, so there's nothing to keep in sync yet.
   */
  private async refreshIfLoaded(): Promise<void> {
    if (this.stateSignal().status === 'idle') return;
    await this.load();
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
