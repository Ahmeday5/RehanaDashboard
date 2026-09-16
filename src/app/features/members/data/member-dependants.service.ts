import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MembersApiService } from './members-api.service';
import { FamilyDependant } from './member.model';
import { ApiError } from '../../../core/models/api-response.model';
import { apiErrorToMessage } from '../../../core/utils/api-error.util';

interface DependantsEntry {
  status: 'idle' | 'loading' | 'success' | 'error';
  items: FamilyDependant[];
  errorMessage: string | null;
}

const IDLE_ENTRY: DependantsEntry = { status: 'idle', items: [], errorMessage: null };

/**
 * Holds each member's family-dependants list, keyed by member id, fetched
 * on demand the first time a row is expanded — this data is small and
 * per-row, so it doesn't belong in `MembersService`'s single `RequestState<Member>`
 * and isn't worth caching through `HttpCacheService` the way the main list is.
 */
@Injectable({ providedIn: 'root' })
export class MemberDependantsService {
  private readonly api = inject(MembersApiService);

  private readonly entriesSignal = signal<ReadonlyMap<number, DependantsEntry>>(new Map());
  readonly entries = this.entriesSignal.asReadonly();

  entryFor(memberId: number): DependantsEntry {
    return this.entriesSignal().get(memberId) ?? IDLE_ENTRY;
  }

  private setEntry(memberId: number, entry: DependantsEntry): void {
    this.entriesSignal.update((map) => {
      const next = new Map(map);
      next.set(memberId, entry);
      return next;
    });
  }

  /** No-op if already loaded/loading, unless `force` is set (e.g. a retry button). */
  async loadFor(memberId: number, force = false): Promise<void> {
    const current = this.entryFor(memberId);
    if (!force && (current.status === 'loading' || current.status === 'success')) return;

    this.setEntry(memberId, { status: 'loading', items: current.items, errorMessage: null });
    try {
      const items = await firstValueFrom(this.api.getFamilyDependants(memberId));
      this.setEntry(memberId, { status: 'success', items, errorMessage: null });
    } catch (err) {
      this.setEntry(memberId, {
        status: 'error',
        items: [],
        errorMessage: apiErrorToMessage(err as ApiError, 'تعذّر تحميل بيانات الأقارب'),
      });
    }
  }
}
