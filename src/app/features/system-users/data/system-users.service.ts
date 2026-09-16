import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SystemUsersApiService } from './system-users-api.service';
import {
  CreateSystemUserRequest,
  SystemUser,
  UpdateSystemUserRequest,
  UpdateSystemUserPasswordRequest,
} from './system-user.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';
import { HttpCacheService } from '../../../core/services/http-cache.service';
import { onInvalidate } from '../../../core/utils/auto-refresh.util';

const SYSTEM_USERS_CACHE_PATTERN = ['getAllOwners'];

/** One signal-based service for the System Users feature — spec §1.3 pattern. */
@Injectable({ providedIn: 'root' })
export class SystemUsersService {
  private readonly api = inject(SystemUsersApiService);
  private readonly httpCache = inject(HttpCacheService);

  private readonly stateSignal = signal<RequestState<SystemUser>>(initialRequestState<SystemUser>());
  readonly state = this.stateSignal.asReadonly();

  /** True only for a manual, cache-bypassing refresh — lets the header button show its own spinner independent of the first page load. */
  private readonly isRefreshingSignal = signal(false);
  readonly isRefreshing = this.isRefreshingSignal.asReadonly();

  constructor() {
    onInvalidate(this.httpCache, SYSTEM_USERS_CACHE_PATTERN, () => this.load());
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
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل قائمة المستخدمين'),
      }));
    } finally {
      if (forceRefresh) this.isRefreshingSignal.set(false);
    }
  }

  /** New users always land at the end of the list — return to page 1 so the confirmation is visible without hunting for it. */
  async create(payload: CreateSystemUserRequest): Promise<SystemUser> {
    const created = await firstValueFrom(this.api.create(payload));
    await this.load(1);
    return created;
  }

  async update(id: string, payload: UpdateSystemUserRequest): Promise<void> {
    await firstValueFrom(this.api.update(id, payload));
    await this.load();
  }

  /** No list refresh needed — a password change doesn't affect anything rendered in the table. */
  async updatePassword(payload: UpdateSystemUserPasswordRequest): Promise<void> {
    await firstValueFrom(this.api.updatePassword(payload));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    const s = this.stateSignal();
    // Deleting the last row on a page beyond the first would otherwise reload into a now-empty page.
    const isLastRowOnPage = s.items.length === 1 && s.page > 1;
    await this.load(isLastRowOnPage ? s.page - 1 : s.page);
  }
}
