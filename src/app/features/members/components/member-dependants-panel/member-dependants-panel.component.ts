import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { MemberDependantsService } from '../../data/member-dependants.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

/**
 * Renders inside a member row's expansion panel (`app-data-table [expandable]`)
 * — fetches `GET /Dashboard/memberFamilyDependants/{memberId}` the first time
 * the row is opened (via `MemberDependantsService`, which caches per member
 * id so re-collapsing/re-expanding the same row doesn't refetch).
 */
@Component({
  selector: 'app-member-dependants-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ButtonComponent],
  templateUrl: './member-dependants-panel.component.html',
  styleUrl: './member-dependants-panel.component.scss',
})
export class MemberDependantsPanelComponent {
  private readonly dependants = inject(MemberDependantsService);

  readonly memberId = input.required<number>();

  protected readonly entry = computed(() => this.dependants.entryFor(this.memberId()));

  constructor() {
    // `loadFor` writes to the service's signal once its network call
    // resolves — that write is async and never re-enters this same effect's
    // own dependencies (it depends only on `memberId`), so it's safe, not a
    // cycle; `allowSignalWrites` is required because Angular still
    // attributes the write back to this effect's context.
    effect(
      () => {
        void this.dependants.loadFor(this.memberId());
      },
      { allowSignalWrites: true },
    );
  }

  protected retry(): void {
    void this.dependants.loadFor(this.memberId(), true);
  }

  protected initial(name: string): string {
    return name?.trim()?.charAt(0)?.toUpperCase() || '؟';
  }
}
