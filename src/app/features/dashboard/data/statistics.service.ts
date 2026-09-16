import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StatisticsApiService } from './statistics-api.service';
import { DashboardStatistics } from './statistics.model';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

export type StatisticsStatus = 'idle' | 'loading' | 'success' | 'error';

export interface StatisticsState {
  status: StatisticsStatus;
  data: DashboardStatistics | null;
  errorMessage: string | null;
}

const INITIAL_STATE: StatisticsState = { status: 'idle', data: null, errorMessage: null };

/** One signal-based service for the dashboard home screen — spec §1.3 pattern, adapted for a single-object (not list) endpoint. */
@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly api = inject(StatisticsApiService);

  private readonly stateSignal = signal<StatisticsState>(INITIAL_STATE);
  readonly state = this.stateSignal.asReadonly();

  private readonly isRefreshingSignal = signal(false);
  readonly isRefreshing = this.isRefreshingSignal.asReadonly();

  async load(forceRefresh = false): Promise<void> {
    if (forceRefresh) this.isRefreshingSignal.set(true);
    this.stateSignal.update((s) => ({ ...s, status: 'loading', errorMessage: null }));
    try {
      const data = await firstValueFrom(this.api.get(forceRefresh));
      this.stateSignal.set({ status: 'success', data, errorMessage: null });
    } catch (err) {
      this.stateSignal.update((s) => ({
        ...s,
        status: 'error',
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل الإحصائيات'),
      }));
    } finally {
      if (forceRefresh) this.isRefreshingSignal.set(false);
    }
  }
}
