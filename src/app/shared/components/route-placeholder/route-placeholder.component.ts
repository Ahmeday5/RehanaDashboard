import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

/**
 * Temporary stand-in for a route whose feature hasn't been built yet in
 * this incremental rollout (spec's screen list, §6.5/§7) — one shared
 * placeholder bound via route `data.title`, not nine copy-pasted stub
 * components. Each is removed as its real feature step lands.
 */
@Component({
  selector: 'app-route-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <div class="pgh">
      <div>
        <div class="pgt">{{ title() }}</div>
        <div class="pgs">هذه الشاشة قيد الإنشاء</div>
      </div>
    </div>
    <app-empty-state message="سيتم إضافة هذه الشاشة في خطوة لاحقة" />
  `,
})
export class RoutePlaceholderComponent {
  readonly title = input<string>('قريباً');
}
