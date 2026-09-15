import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

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
  imports: [CommonModule, EmptyStateComponent],
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

  rowClick = output<T>();

  rowKey(row: T): unknown {
    return row[this.trackByKey()];
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
