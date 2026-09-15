import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OwnersApiService } from './owners-api.service';
import { CreateOwnerRequest, Owner, UpdateOwnerRequest } from './owner.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

/**
 * One signal-based service for the Owners feature — the spec §1.3 pattern,
 * replacing the Flutter app's `UserState` (17 hand-written subclasses,
 * spec §8) with a single `RequestState<Owner>`.
 */
@Injectable({ providedIn: 'root' })
export class OwnersService {
  private readonly api = inject(OwnersApiService);

  private readonly stateSignal = signal<RequestState<Owner>>(initialRequestState<Owner>());
  readonly state = this.stateSignal.asReadonly();

  async load(): Promise<void> {
    this.stateSignal.update((s) => ({ ...s, status: 'loading', errorMessage: null }));
    try {
      const items = await firstValueFrom(this.api.getAllOwners());
      this.stateSignal.update((s) => ({
        ...s,
        status: 'success',
        items,
        totalItems: items.length,
      }));
    } catch (err) {
      this.stateSignal.update((s) => ({
        ...s,
        status: 'error',
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل قائمة الملاك'),
      }));
    }
  }

  /** Throws on failure so the calling form can surface its own inline error — does not touch `state`. */
  async create(payload: CreateOwnerRequest): Promise<Owner> {
    const created = await firstValueFrom(this.api.create(payload));
    await this.load();
    return created;
  }

  async update(payload: UpdateOwnerRequest): Promise<void> {
    await firstValueFrom(this.api.update(payload));
    await this.load();
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    await this.load();
  }
}
