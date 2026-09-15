import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

/**
 * The one button component for the app — replaces the Flutter source's two
 * competing `CustomButton` widgets (different heights, radii, and default
 * colors; spec §1.5 row 1) and the hand-typed `class="btn btn-bl ..."` +
 * inline spinner markup duplicated at every submit button call site today
 * (login, forgot-password, reset-password all repeat the same
 * `@if (loading) { spinner } @else { label }` block).
 *
 *   <app-button (click)="submit()" [loading]="isSubmitting()">حفظ</app-button>
 *   <app-button variant="danger" size="sm" (click)="onDelete()">حذف</app-button>
 *   <app-button variant="ghost" [disabled]="true">إلغاء</app-button>
 */
@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  readonly loading = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);
  /** Circular, padding-free variant for a single icon — e.g. table row actions. */
  readonly iconOnly = input<boolean>(false);

  readonly clicked = output<MouseEvent>();

  protected onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) return;
    this.clicked.emit(event);
  }
}
