import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconComponent } from '../icon/icon.component';

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'right' | 'left' | 'center';
  cellTemplate?: TemplateRef<any>;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, EmptyStateComponent, IconComponent],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T extends Record<string, any>> {
  columns = input.required<TableColumn[]>();
  data = input.required<T[]>();

  trackByKey = input<string>('id');
  hasActions = input<boolean>(false);
  /**
   * Per-row actions template, given the row as `$implicit` — e.g.
   *   <ng-template #rowActions let-row>
   *     <app-button (clicked)="edit(row)">...</app-button>
   *   </ng-template>
   *   <app-data-table ... [hasActions]="true" [actionsTemplate]="rowActions" />
   *
   * A single static `<ng-content select="[actions]">` cannot be per-row —
   * content projection renders the same projected nodes in every row with no
   * way to know which row is being rendered — always use this instead.
   */
  actionsTemplate = input<TemplateRef<any> | null>(null);
  rowClickable = input<boolean>(false);
  emptyMessage = input<string>('No data available');
  actionsLabel = input<string>('Actions');

  /**
   * Optional inline expansion — a chevron toggle column reveals
   * `expandedTemplate` (row as `$implicit`) in a full-width row underneath.
   * Used for e.g. a member's family dependants — data one level down that
   * doesn't deserve its own route or modal, just a disclosure in place.
   */
  expandable = input<boolean>(false);
  expandedTemplate = input<TemplateRef<any> | null>(null);
  /** Label on the toggle button itself (e.g. "الأقارب") — a bare chevron with no label reads as decoration, not an action. */
  expandLabel = input<string>('التفاصيل');

  /**
   * True while a filter/search/pagination refetch is in flight for data
   * ALREADY on screen — distinct from the caller's own first-load skeleton
   * (shown before this component ever renders). Dims the existing rows and
   * shows a slim brand-gradient progress bar at the table's edge instead of
   * a page-wide freeze, so re-filtering an already-visible table never
   * blocks the rest of the screen (confirmed 2026-09-16).
   */
  refreshing = input<boolean>(false);

  rowClick = output<T>();

  private readonly expandedKeys = signal<ReadonlySet<unknown>>(new Set());

  rowKey(row: T): unknown {
    return row[this.trackByKey()];
  }

  isExpanded(row: T): boolean {
    return this.expandedKeys().has(this.rowKey(row));
  }

  toggleExpanded(row: T): void {
    const key = this.rowKey(row);
    this.expandedKeys.update((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  getCellValue(row: T, key: string): string {
    const keys = key.split('.');
    let val: any = row;

    for (const k of keys) {
      val = val?.[k];
    }

    return val ?? '—';
  }
}
