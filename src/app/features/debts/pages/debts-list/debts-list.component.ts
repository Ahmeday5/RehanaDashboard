import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DebtsService } from '../../data/debts.service';
import { Debt } from '../../data/debt.model';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { VillaSelectComponent } from '../../../../shared/components/villa-select/villa-select.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { AddDebtModalComponent } from '../../components/add-debt-modal/add-debt-modal.component';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * "مديونات أخرى" — every manually-recorded `Debt`, unrelated to
 * maintenance bonds (confirmed 2026-09-16). Only `villaNumber` is a
 * confirmed server-side filter — no member-name/date-range params exist
 * for this endpoint, unlike `bonds`.
 */
@Component({
  selector: 'app-debts-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    ButtonComponent,
    RefreshButtonComponent,
    PaginationComponent,
    VillaSelectComponent,
    IconComponent,
    AddDebtModalComponent,
  ],
  templateUrl: './debts-list.component.html',
  styleUrl: './debts-list.component.scss',
})
export class DebtsListComponent implements OnInit {
  protected readonly service = inject(DebtsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly addModal = viewChild.required(AddDebtModalComponent);
  protected readonly isRefreshing = signal(false);

  protected readonly columns: TableColumn[] = [
    { key: 'villaNumber', label: 'الفيلا', align: 'center' },
    { key: 'memberName', label: 'المالك', align: 'right' },
    { key: 'createdAt', label: 'التاريخ', align: 'center' },
    { key: 'notes', label: 'ملاحظات', align: 'right' },
    { key: 'amount', label: 'المبلغ', align: 'center' },
  ];

  protected readonly filterForm = this.fb.nonNullable.group({
    villaNumber: [''],
  });

  ngOnInit(): void {
    void this.service.load();

    // The villa picker commits its own value instantly on selection/clear —
    // no debounce needed, unlike a free-text filter (confirmed 2026-09-16:
    // every filter applies live).
    this.filterForm.valueChanges.subscribe((value) => this.service.setFilters(value as { villaNumber: string }));
  }

  protected openAddModal(): void {
    this.addModal().launch();
  }

  protected onDebtCreated(): void {
    this.toast.success('تم إضافة المديونية بنجاح');
  }

  protected resetFilters(): void {
    this.filterForm.reset({ villaNumber: '' }, { emitEvent: false });
    this.service.clearFilters();
  }

  protected hasActiveFilters(): boolean {
    return !!this.service.filters().villaNumber;
  }

  protected async refresh(): Promise<void> {
    this.isRefreshing.set(true);
    try {
      await this.service.load();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  protected formatAmount(debt: Debt): string {
    return `${debt.amount.toLocaleString('ar-EG')} ج.م`;
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  }
}
