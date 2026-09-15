import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SystemUsersApiService } from './system-users-api.service';
import { CreateSystemUserRequest, SystemUser, UpdateSystemUserRequest } from './system-user.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

/** One signal-based service for the System Users feature — spec §1.3 pattern. */
@Injectable({ providedIn: 'root' })
export class SystemUsersService {
  private readonly api = inject(SystemUsersApiService);

  private readonly stateSignal = signal<RequestState<SystemUser>>(initialRequestState<SystemUser>());
  readonly state = this.stateSignal.asReadonly();

  async load(): Promise<void> {
    this.stateSignal.update((s) => ({ ...s, status: 'loading', errorMessage: null }));
    try {
      const items = await firstValueFrom(this.api.getAll());
      this.stateSignal.update((s) => ({ ...s, status: 'success', items, totalItems: items.length }));
    } catch (err) {
      this.stateSignal.update((s) => ({
        ...s,
        status: 'error',
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل قائمة المستخدمين'),
      }));
    }
  }

  async create(payload: CreateSystemUserRequest): Promise<SystemUser> {
    const created = await firstValueFrom(this.api.create(payload));
    await this.load();
    return created;
  }

  async update(id: string, payload: UpdateSystemUserRequest): Promise<void> {
    await firstValueFrom(this.api.update(id, payload));
    await this.load();
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    await this.load();
  }
}
