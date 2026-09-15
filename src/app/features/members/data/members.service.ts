import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MembersApiService } from './members-api.service';
import { CreateMemberRequest, Member, UpdateMemberRequest } from './member.model';
import { RequestState, initialRequestState } from '../../../shared/data/request-state';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

/** One signal-based service for the Members feature — spec §1.3 pattern. */
@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly api = inject(MembersApiService);

  private readonly stateSignal = signal<RequestState<Member>>(initialRequestState<Member>());
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
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل قائمة الملاك'),
      }));
    }
  }

  async create(payload: CreateMemberRequest): Promise<Member> {
    const created = await firstValueFrom(this.api.create(payload));
    await this.load();
    return created;
  }

  async update(payload: UpdateMemberRequest): Promise<void> {
    await firstValueFrom(this.api.update(payload));
    await this.load();
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    await this.load();
  }
}
