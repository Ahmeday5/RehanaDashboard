import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * The one "refresh this cached list" affordance for the app — every screen
 * backed by a cached GET (Members, Security Guards, System Users, and any
 * future stats/report screen) gets this same button rather than a bespoke
 * one-off per page. Placed in the page header next to the title.
 *
 * Two states of feedback beyond the caller's own `loading` input:
 *   - the icon spins continuously while `loading()` is true (network in flight)
 *   - a brief "done" pulse plays right after `loading` flips back to false,
 *     so a fast cache-bypass refetch still gives visible confirmation instead
 *     of the button silently doing nothing for 200ms
 *
 *   <app-refresh-button [loading]="members.isLoading()" (refresh)="members.load(true)" />
 */
@Component({
  selector: 'app-refresh-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './refresh-button.component.html',
  styleUrl: './refresh-button.component.scss',
})
export class RefreshButtonComponent {
  readonly loading = input<boolean>(false);
  readonly label = input<string>('تحديث');
  readonly refresh = output<void>();

  protected readonly justCompleted = signal(false);
  private wasLoading = false;

  constructor() {
    effect(
      () => {
        const isLoading = this.loading();
        if (this.wasLoading && !isLoading) {
          this.justCompleted.set(true);
          setTimeout(() => this.justCompleted.set(false), 600);
        }
        this.wasLoading = isLoading;
      },
      { allowSignalWrites: true },
    );
  }

  protected onClick(): void {
    if (this.loading()) return;
    this.refresh.emit();
  }
}
