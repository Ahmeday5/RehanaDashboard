import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';

/**
 * "No data" placeholder — genuinely new functionality. No dedicated
 * empty-state component exists anywhere in the Flutter source (spec §10
 * issue 16); every list screen there falls through to a blank table body
 * or an implicit empty area. Used standalone (an empty contacts list, an
 * empty collections page) as well as by `DataTableComponent`'s own
 * built-in empty row.
 *
 *   <app-empty-state message="لا يوجد ملاك بعد" />
 *   <app-empty-state message="لا توجد نتائج" actionLabel="اضافة مالك" (action)="addOwner()" />
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly message = input<string>('لا توجد بيانات');
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();
}
