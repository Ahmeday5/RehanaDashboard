import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BondsApiService } from './bonds-api.service';
import { BondEventsService } from './bond-events.service';
import { BondRow, BondsYearSummary, MemberReceiptRequest, toBondRow } from './bond.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

/** `''` = all bonds, `'true'` = maintenance-difference payments only, `'false'` = regular bonds only. */
export type BondKindFilter = '' | 'true' | 'false';

export interface MaintenancePaymentsFilters {
  kind: BondKindFilter;
  villaNumber: string;
  memberName: string;
  fromDate: string;
  toDate: string;
}

export type YearSummaryState =
  | { status: 'idle' }
  | { status: 'loading'; villaNumber: string }
  | { status: 'success'; villaNumber: string; rows: BondsYearSummary[] }
  | { status: 'error'; villaNumber: string; message: string };

const EMPTY_FILTERS: MaintenancePaymentsFilters = {
  kind: '',
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
  private readonly events = inject(BondEventsService);

  private readonly stateSignal = signal<RequestState<BondRow>>(initialRequestState<BondRow>());
  readonly state = this.stateSignal.asReadonly();

  private readonly filtersSignal = signal<MaintenancePaymentsFilters>(EMPTY_FILTERS);
  readonly filters = this.filtersSignal.asReadonly();

  private readonly isSubmittingSignal = signal(false);
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();

  /** Per-year receipts/disbursements for the filtered villa — `idle` while no villa filter is set. */
  private readonly yearSummarySignal = signal<YearSummaryState>({ status: 'idle' });
  readonly yearSummary = this.yearSummarySignal.asReadonly();
  private yearSummaryVilla = '';
  private yearSummaryRequest = 0;

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

    // Paging through the same villa doesn't change its yearly totals — only
    // refetch on a reload, a jump to page 1, or a different villa.
    if (page === undefined || targetPage === 1 || f.villaNumber !== this.yearSummaryVilla) {
      void this.loadYearSummary(f.villaNumber);
    }

    this.stateSignal.update((s) => ({ ...s, status: 'loading', errorMessage: null }));
    try {
      const res = await firstValueFrom(
        this.api.list({
          type: 'Receipt',
          isMaintenanceDifference: f.kind === '' ? undefined : f.kind === 'true',
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

  private async loadYearSummary(villaNumber: string): Promise<void> {
    this.yearSummaryVilla = villaNumber;
    const request = ++this.yearSummaryRequest;
    if (!villaNumber) {
      this.yearSummarySignal.set({ status: 'idle' });
      return;
    }
    this.yearSummarySignal.set({ status: 'loading', villaNumber });
    try {
      const rows = await firstValueFrom(this.api.summaryByYear(villaNumber));
      if (request !== this.yearSummaryRequest) return; // a newer villa was picked meanwhile
      this.yearSummarySignal.set({
        status: 'success',
        villaNumber,
        rows: [...rows].sort((a, b) => b.year - a.year),
      });
    } catch (err) {
      if (request !== this.yearSummaryRequest) return;
      this.yearSummarySignal.set({
        status: 'error',
        villaNumber,
        message: apiErrorToMessage(err as ApiError, 'تعذّر تحميل ملخص الفيلا بالسنة'),
      });
    }
  }

  async createPayment(payload: MemberReceiptRequest): Promise<void> {
    this.isSubmittingSignal.set(true);
    try {
      await firstValueFrom(this.api.memberReceipt(payload));
      // Announce before our own reload so dependent screens (maintenance
      // differences' paid/remaining) start refetching in parallel.
      this.events.notifyReceiptRecorded(payload);
      await this.load(1);
    } finally {
      this.isSubmittingSignal.set(false);
    }
  }
}
