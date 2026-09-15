import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SecurityGuardsApiService } from './security-guards-api.service';
import { CreateSecurityGuardRequest, SecurityGuard, UpdateSecurityGuardRequest } from './security-guard.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

/** One signal-based service for the Security Guards feature — spec §1.3 pattern. */
@Injectable({ providedIn: 'root' })
export class SecurityGuardsService {
  private readonly api = inject(SecurityGuardsApiService);

  private readonly stateSignal = signal<RequestState<SecurityGuard>>(initialRequestState<SecurityGuard>());
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
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل قائمة حراس الأمن'),
      }));
    }
  }

  async create(payload: CreateSecurityGuardRequest): Promise<SecurityGuard> {
    const created = await firstValueFrom(this.api.create(payload));
    await this.load();
    return created;
  }

  async update(payload: UpdateSecurityGuardRequest): Promise<void> {
    await firstValueFrom(this.api.update(payload));
    await this.load();
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    await this.load();
  }
}
