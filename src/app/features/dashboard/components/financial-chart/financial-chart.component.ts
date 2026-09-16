import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal } from '@angular/core';

/**
 * Receipts-vs-disbursements comparison bar chart — a lightweight hand-built
 * SVG rather than pulling in a charting library (same reasoning as the
 * icon set: this app avoids npm dependencies for something this small,
 * having already been burned once by a package that didn't tree-shake —
 * see `IconComponent`). Bars grow in from zero height on first scroll into
 * view, matching the stat cards' entrance choreography.
 *
 *   <app-financial-chart [receipts]="14100" [disbursements]="1203523" />
 */
@Component({
  selector: 'app-financial-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './financial-chart.component.html',
  styleUrl: './financial-chart.component.scss',
})
export class FinancialChartComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly receipts = input.required<number>();
  readonly disbursements = input.required<number>();

  protected readonly hasEntered = signal(false);

  private readonly maxValue = computed(() => Math.max(this.receipts(), this.disbursements(), 1));
  protected readonly receiptsPct = computed(() => (this.receipts() / this.maxValue()) * 100);
  protected readonly disbursementsPct = computed(() => (this.disbursements() / this.maxValue()) * 100);

  constructor() {
    let started = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (started || !entries[0]?.isIntersecting) return;
        started = true;
        observer.disconnect();
        requestAnimationFrame(() => this.hasEntered.set(true));
      },
      { threshold: 0.2 },
    );

    effect((onCleanup) => {
      observer.observe(this.host.nativeElement);
      onCleanup(() => observer.disconnect());
    });
  }

  protected formatAmount(value: number): string {
    return `${value.toLocaleString('ar-EG')} ج.م`;
  }
}
