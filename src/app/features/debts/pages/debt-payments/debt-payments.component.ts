import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DebtPaymentsService } from '../../data/debt-payments.service';
import { CreateDebtPaymentResponse, DebtPayment } from '../../data/debt.model';
import { DataTableComponent, TableColumn } from '../../../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { RefreshButtonComponent } from '../../../../shared/components/refresh-button/refresh-button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { VillaSelectComponent } from '../../../../shared/components/villa-select/villa-select.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { AddDebtPaymentModalComponent } from '../../components/add-debt-payment-modal/add-debt-payment-modal.component';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * "مدفوعات المديونيات" — every `DebtPayment`, i.e. every payment made
 * against an "other debt" (confirmed 2026-09-16). A separate screen from
 * the debts list even though both concern the same villa's balance —
 * mirrors the maintenance-differences/payments split.
 */
@Component({
  selector: 'app-debt-payments',
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
    AddDebtPaymentModalComponent,
  ],
  templateUrl: './debt-payments.component.html',
  styleUrl: './debt-payments.component.scss',
})
export class DebtPaymentsComponent implements OnInit {
  protected readonly service = inject(DebtPaymentsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly addModal = viewChild.required(AddDebtPaymentModalComponent);
  protected readonly isRefreshing = signal(false);

  protected readonly columns: TableColumn[] = [
    { key: 'villaNumber', label: 'الفيلا', align: 'center' },
    { key: 'memberName', label: 'المالك', align: 'right' },
    { key: 'date', label: 'التاريخ', align: 'center' },
    { key: 'notes', label: 'ملاحظات', align: 'right' },
    { key: 'amount', label: 'المبلغ', align: 'center' },
  ];

  protected readonly filterForm = this.fb.nonNullable.group({
    villaNumber: [''],
  });

  ngOnInit(): void {
    void this.service.load();
    this.filterForm.valueChanges.subscribe((value) => this.service.setFilters(value as { villaNumber: string }));
  }

  protected openAddModal(): void {
    this.addModal().launch();
  }

  protected onPaymentCreated(result: CreateDebtPaymentResponse): void {
    const outstanding = result.totalOutstanding;
    const title =
      outstanding > 0
        ? `متبقٍ: ${outstanding.toLocaleString('ar-EG')} ج.م`
        : outstanding < 0
          ? `رصيد دائن: ${Math.abs(outstanding).toLocaleString('ar-EG')} ج.م`
          : 'تم السداد بالكامل';
    this.toast.success(result.message, { title });
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

  protected formatAmount(payment: DebtPayment): string {
    return `${payment.amount.toLocaleString('ar-EG')} ج.م`;
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  }
}
