import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, signal } from '@angular/core';
import { IconComponent, IconName } from '../../../../shared/components/icon/icon.component';

export type StatCardTone = 'primary' | 'info' | 'success' | 'danger' | 'neutral';

const COUNT_UP_MS = 900;

/**
 * One animated, gradient-accented statistic tile for the dashboard home
 * screen. Counts up from 0 to its value on first paint (via
 * `IntersectionObserver` so off-screen cards animate when scrolled into
 * view, not all at once on load) — the "أنيميشن كتير" the flagship screen
 * was explicitly asked for (confirmed 2026-09-16), applied as a genuine
 * value-reveal rather than decoration.
 *
 *   <app-stat-card icon="users" label="إجمالي الملاك" [value]="7" tone="primary" />
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly tone = input<StatCardTone>('primary');
  /** Optional trailing unit/suffix (e.g. "ج.م") appended after the animated number. */
  readonly suffix = input<string>('');
  /** Stagger delay (ms) for the entrance animation — lets a grid of cards cascade in rather than pop together. */
  readonly delayMs = input<number>(0);

  protected readonly displayValue = signal(0);
  protected readonly hasEntered = signal(false);

  constructor() {
    let started = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (started || !entries[0]?.isIntersecting) return;
        started = true;
        observer.disconnect();
        setTimeout(() => this.hasEntered.set(true), this.delayMs());
        this.animateCountUp();
      },
      { threshold: 0.2 },
    );

    effect((onCleanup) => {
      observer.observe(this.host.nativeElement);
      onCleanup(() => observer.disconnect());
    });
  }

  private animateCountUp(): void {
    const target = this.value();
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / COUNT_UP_MS);
      // easeOutExpo — fast start, gentle settle; reads as "snapping into place" rather than a linear ticker.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      this.displayValue.set(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
