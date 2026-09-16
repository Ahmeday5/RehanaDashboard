import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SecurityGuardsApiService } from './security-guards-api.service';
import {
  CreateSecurityGuardRequest,
  SecurityGuard,
  UpdateSecurityGuardRequest,
  UpdateSecurityGuardPasswordRequest,
} from './security-guard.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';
import { HttpCacheService } from '../../../core/services/http-cache.service';
import { onInvalidate } from '../../../core/utils/auto-refresh.util';

const SECURITY_GUARDS_CACHE_PATTERN = ['getAllSecurityGuards'];

/** One signal-based service for the Security Guards feature — spec §1.3 pattern. */
@Injectable({ providedIn: 'root' })
export class SecurityGuardsService {
  private readonly api = inject(SecurityGuardsApiService);
  private readonly httpCache = inject(HttpCacheService);

  private readonly stateSignal = signal<RequestState<SecurityGuard>>(initialRequestState<SecurityGuard>());
  readonly state = this.stateSignal.asReadonly();

  /** True only for a manual, cache-bypassing refresh — lets the header button show its own spinner independent of the first page load. */
  private readonly isRefreshingSignal = signal(false);
  readonly isRefreshing = this.isRefreshingSignal.asReadonly();

  constructor() {
    onInvalidate(this.httpCache, SECURITY_GUARDS_CACHE_PATTERN, () => this.load());
  }

  /** Loads a specific page; defaults to the current state's page/pageSize so a mutation can just call `load()` to refresh in place. */
  async load(page?: number, pageSize?: number, forceRefresh = false): Promise<void> {
    const targetPage = page ?? this.stateSignal().page;
    const targetPageSize = pageSize ?? this.stateSignal().pageSize;

    if (forceRefresh) this.isRefreshingSignal.set(true);
    this.stateSignal.update((s) => ({ ...s, status: 'loading', errorMessage: null }));
    try {
      const res = await firstValueFrom(this.api.getAll(targetPage, targetPageSize, forceRefresh));
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
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل قائمة حراس الأمن'),
      }));
    } finally {
      if (forceRefresh) this.isRefreshingSignal.set(false);
    }
  }

  /** New guards always land at the end of the list — return to page 1 so the confirmation is visible without hunting for it. */
  async create(payload: CreateSecurityGuardRequest): Promise<SecurityGuard> {
    const created = await firstValueFrom(this.api.create(payload));
    await this.load(1);
    return created;
  }

  async update(payload: UpdateSecurityGuardRequest): Promise<void> {
    await firstValueFrom(this.api.update(payload));
    await this.load();
  }

  /** No list refresh needed — a password change doesn't affect anything rendered in the table. */
  async updatePassword(payload: UpdateSecurityGuardPasswordRequest): Promise<void> {
    await firstValueFrom(this.api.updatePassword(payload));
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    const s = this.stateSignal();
    // Deleting the last row on a page beyond the first would otherwise reload into a now-empty page.
    const isLastRowOnPage = s.items.length === 1 && s.page > 1;
    await this.load(isLastRowOnPage ? s.page - 1 : s.page);
  }
}
